
import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar as BigCalendar,
  momentLocalizer,
  SlotInfo,
} from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import {
  startOfWeek,
  endOfWeek,
  format,
  addHours,
  isBefore,
  getDay,
  getHours,
  differenceInMinutes,
} from "date-fns";
import { toast } from "sonner";

const localizer = momentLocalizer(moment);

interface ProposalDialogProps {
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
  handleSendProposal: (
    start: Date,
    end: Date,
    venue?: "host" | "visit"
  ) => void;
  sending: boolean;
  professionalId: string;
}

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
};

interface CalendarEvent {
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  resource?: unknown;
}

interface WorkingHour {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

const ProposalDialog: React.FC<ProposalDialogProps> = ({
  isOpen,
  setIsOpen,
  handleSendProposal,
  sending,
  professionalId,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookedEvents, setBookedEvents] = useState<CalendarEvent[]>([]);
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>([]);
  const [newProposalSlot, setNewProposalSlot] = useState<{
    start: Date;
    end: Date;
  } | null>(null);
  const [selectedVenue, setSelectedVenue] = useState<
    "host" | "visit" | undefined
  >(undefined);
  const [professionalVenue, setProfessionalVenue] = useState<
    "host" | "visit" | "both"
  >("both");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !professionalId) return;
    const fetchProfessional = async () => {
      try {
        const res = await fetch(`/api/professionals?id=${professionalId}`);
        if (!res.ok) throw new Error("Failed to fetch professional");
        const data = await res.json();
        setProfessionalVenue(data.venue);
        if (data.venue !== "both") setSelectedVenue(data.venue);
      } catch (error) {
        console.error(error);
        toast.error("Failed to fetch professional details");
      }
    };
    fetchProfessional();
  }, [isOpen, professionalId]);

  const fetchSchedule = useCallback(
    async (date: Date) => {
      setLoading(true);
      const start = startOfWeek(date, { weekStartsOn: 1 });
      const end = endOfWeek(date, { weekStartsOn: 1 });
      try {
        const res = await fetch(
          `/api/professionals/schedule?professionalId=${professionalId}&startDate=${format(start, "yyyy-MM-dd")}&endDate=${format(end, "yyyy-MM-dd")}`
        );
        if (!res.ok) throw new Error("Failed to load schedule");
        const { events, workingHours: fetchedWorkingHours } = await res.json();
        setBookedEvents(
          events.map((e: { title: string; start: string; end: string }) => ({
            ...e,
            start: new Date(e.start),
            end: new Date(e.end),
          }))
        );
        setWorkingHours(fetchedWorkingHours);
      } catch (error) {
        toast.error((error as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [professionalId]
  );

  useEffect(() => {
    if (isOpen) fetchSchedule(currentDate);
  }, [isOpen, currentDate, fetchSchedule]);

  const handleSelectSlot = (slotInfo: SlotInfo) => {
    if (isBefore(slotInfo.start, new Date())) return;

    const isOverlapping = bookedEvents.some(
      (event) => slotInfo.start < event.end && slotInfo.end > event.start
    );
    if (isOverlapping) {
      toast.warning("This time overlaps with a booked session or buffer.");
      return;
    }

    const isClick = moment(slotInfo.start).isSame(
      moment(slotInfo.end),
      "minute"
    );
    const bookingEnd = isClick ? addHours(slotInfo.start, 1) : slotInfo.end;

    const finalOverlapCheck = bookedEvents.some(
      (event) => slotInfo.start < event.end && bookingEnd > event.start
    );
    if (finalOverlapCheck) {
      toast.warning("Selection overlaps with a booked session or buffer.");
      return;
    }

    setNewProposalSlot({ start: slotInfo.start, end: bookingEnd });
  };

  const slotPropGetter = useCallback(
    (date: Date) => {
      const day = getDay(date);
      const hour = getHours(date);

      const dayWorkingHours = workingHours.find((wh) => wh.dayOfWeek === day);

      if (!dayWorkingHours)
        return {
          className: "rbc-slot-disabled",
          style: { backgroundColor: "#B0B0B0" },
        };

      const startHour = parseInt(dayWorkingHours.startTime.split(":")[0], 10);
      const endHour = parseInt(dayWorkingHours.endTime.split(":")[0], 10);

      if (hour < startHour || hour >= endHour)
        return {
          className: "rbc-slot-disabled",
          style: { backgroundColor: "#B0B0B0" },
        };

      return { style: { backgroundColor: "#FFFFFF" } };
    },
    [workingHours]
  );

  const eventPropGetter = useCallback((event: CalendarEvent) => {
    if (event.title === "Blocked (Buffer)") {
      return {
        className: "border",
        style: {
          backgroundColor: "#E0D5D5",
          color: "#333333",
          borderColor: "#D4A5A5",
          opacity: 0.7,
        },
      };
    }
    return {
      className: "border",
      style: {
        backgroundColor: "#D4A5A5",
        color: "#333333",
        borderColor: "#B0B0B0",
      },
    };
  }, []);

  const { min, max } = {
    min: moment().startOf("day").add(8, "hours").toDate(),
    max: moment().startOf("day").add(20, "hours").toDate(),
  };

  const onSend = () => {
    if (!newProposalSlot) {
      toast.error("Please select a time slot");
      return;
    }
    if (professionalVenue === "both" && !selectedVenue) {
      toast.error("Please select a venue");
      return;
    }
    handleSendProposal(
      newProposalSlot.start,
      newProposalSlot.end,
      selectedVenue
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <AnimatePresence>
        {isOpen && (
          <DialogContent className="bg-white dark:bg-gray-800 sm:max-w-[800px] rounded-xl shadow-lg">
            <motion.div
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
            >
              <DialogHeader>
                <DialogTitle className="text-2xl font-semibold text-black dark:text-white">
                  Propose Session
                </DialogTitle>
              </DialogHeader>
              <div className="py-4">
                {loading ? (
                  <div className="h-[50vh] flex items-center justify-center">
                    Loading schedule...
                  </div>
                ) : (
                  <BigCalendar
                    localizer={localizer}
                    events={bookedEvents}
                    defaultView="week"
                    views={["week", "day"]}
                    date={currentDate}
                    onNavigate={(newDate) => setCurrentDate(newDate)}
                    onSelectSlot={handleSelectSlot}
                    selectable
                    step={30}
                    timeslots={2}
                    style={{ height: "50vh" }}
                    min={min}
                    max={max}
                    slotPropGetter={slotPropGetter}
                    eventPropGetter={eventPropGetter}
                  />
                )}
                {newProposalSlot && (
                  <div className="mt-4">
                    <p>
                      Selected:{" "}
                      {format(newProposalSlot.start, "MMMM d, yyyy h:mm a")} -{" "}
                      {format(newProposalSlot.end, "h:mm a")}
                    </p>
                    <p>
                      Duration:{" "}
                      {differenceInMinutes(
                        newProposalSlot.end,
                        newProposalSlot.start
                      ) / 60}{" "}
                      hour(s)
                    </p>
                  </div>
                )}
                {professionalVenue === "both" && (
                  <div className="mt-4">
                    <Label className="text-sm font-medium text-black dark:text-white mb-2">
                      Venue
                    </Label>
                    <Select
                      value={selectedVenue}
                      onValueChange={(v: "host" | "visit") =>
                        setSelectedVenue(v)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select venue..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="host">
                          Professional will host
                        </SelectItem>
                        <SelectItem value="visit">
                          Professional will visit you
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <DialogFooter className="mt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  className="text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#fff]/80 dark:hover:bg-[#C4C4C4]/20"
                >
                  Cancel
                </Button>
                <Button
                  onClick={onSend}
                  disabled={
                    sending ||
                    !newProposalSlot ||
                    (professionalVenue === "both" && !selectedVenue)
                  }
                  className="bg-[#F3CFC6] hover:bg-[#C4C4C4] text-black dark:text-white"
                >
                  {sending ? "Sending..." : "Send Proposal"}
                </Button>
              </DialogFooter>
            </motion.div>
          </DialogContent>
        )}
      </AnimatePresence>
    </Dialog>
  );
};

export default ProposalDialog;
