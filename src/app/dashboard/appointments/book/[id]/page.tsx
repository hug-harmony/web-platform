/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar as BigCalendar,
  momentLocalizer,
  SlotInfo,
  Event,
} from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import {
  startOfWeek,
  endOfWeek,
  format,
  addHours,
  isBefore,
  differenceInMinutes,
  addMinutes,
} from "date-fns"; // Ensure date-fns is installed: npm i date-fns

interface Therapist {
  _id: string;
  name: string;
  rate: number;
  venue: "host" | "visit" | "both";
}

interface BookedEvent extends Event {
  id: string;
  title: string;
  start: Date;
  end: Date;
}

interface WorkingHour {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface NewBookingSlot {
  start: Date;
  end: Date;
}

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const localizer = momentLocalizer(moment);

const BookingPage: React.FC = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id: therapistId } = useParams();

  const [therapist, setTherapist] = useState<Therapist | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookedEvents, setBookedEvents] = useState<BookedEvent[]>([]);
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>([]);
  const [newBookingSlot, setNewBookingSlot] = useState<NewBookingSlot | null>(
    null
  );
  const [selectedVenue, setSelectedVenue] = useState<
    "host" | "visit" | undefined
  >(undefined);
  // NEW: State to flag if the slot is <24h from now (request mode)
  const [isRequestMode, setIsRequestMode] = useState(false);

  // Fetch therapist (unchanged)
  useEffect(() => {
    if (!therapistId) return;
    const fetchTherapist = async () => {
      try {
        const res = await fetch(`/api/specialists?id=${therapistId}`);
        if (!res.ok) throw new Error("Failed to fetch specialist");
        const data = await res.json();
        setTherapist(data);
        if (data.venue !== "both") setSelectedVenue(data.venue);
      } catch (error) {
        toast.error((error as Error).message);
      }
    };
    fetchTherapist();
  }, [therapistId]);

  // Fetch schedule (unchanged)
  const fetchSchedule = useCallback(
    async (date: Date) => {
      if (!therapistId) return;
      setLoading(true);
      const start = startOfWeek(date, { weekStartsOn: 1 });
      const end = endOfWeek(date, { weekStartsOn: 1 });

      try {
        const res = await fetch(
          `/api/specialists/schedule?specialistId=${therapistId}&startDate=${format(start, "yyyy-MM-dd")}&endDate=${format(end, "yyyy-MM-dd")}`
        );
        if (!res.ok) throw new Error("Failed to load schedule.");
        const { events, workingHours: fetched } = await res.json();

        setBookedEvents(
          events.map((e: any) => ({
            ...e,
            start: new Date(e.start),
            end: new Date(e.end),
          }))
        );
        setWorkingHours(fetched || []);
      } catch (error) {
        toast.error((error as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [therapistId]
  );

  useEffect(() => {
    fetchSchedule(currentDate);
  }, [currentDate, fetchSchedule]);

  const handleNavigate = (newDate: Date) => setCurrentDate(newDate);

  const handleSelectSlot = useCallback(
    (slotInfo: SlotInfo) => {
      // Block past dates (unchanged)
      if (isBefore(slotInfo.start, new Date())) {
        toast.warning("Cannot select past time.");
        return;
      }

      // Helper: check if a time is within any working block (unchanged)
      const isTimeAvailable = (date: Date): boolean => {
        const day = date.getDay();
        const hour = date.getHours();
        const minute = date.getMinutes();
        const slotMins = hour * 60 + minute;

        const dayBlocks = workingHours.filter((w) => w.dayOfWeek === day);
        if (dayBlocks.length === 0) return false;

        return dayBlocks.some((block) => {
          const [sh, sm] = block.startTime.split(":").map(Number);
          const [eh, em] = block.endTime.split(":").map(Number);
          const startMins = sh * 60 + sm;
          const endMins = eh * 60 + em;
          return slotMins >= startMins && slotMins < endMins;
        });
      };

      // Check every 30-min step in selection (unchanged)
      const start = slotInfo.start;
      const isClick = moment(start).isSame(moment(slotInfo.end), "minute");
      const end = isClick ? addHours(start, 1) : slotInfo.end;

      let current = new Date(start);
      while (current < end) {
        if (!isTimeAvailable(current)) {
          toast.warning("Selection includes unavailable time.");
          return;
        }
        current = addMinutes(current, 30);
      }

      // Check overlap with booked events (unchanged)
      const overlaps = bookedEvents.some((e) => start < e.end && end > e.start);
      if (overlaps) {
        toast.warning("Overlaps with booked session or buffer.");
        return;
      }

      // Valid → set slot and check for request mode
      setNewBookingSlot({ start, end });

      // NEW: Check if start is <24h from now
      const now = new Date();
      const twentyFourHoursFromNow = addHours(now, 24);
      setIsRequestMode(isBefore(start, twentyFourHoursFromNow));

      setIsDialogOpen(true);
    },
    [bookedEvents, workingHours]
  );

  // UPDATED: Handler now checks isRequestMode and calls appropriate API
  const handleConfirmAction = async () => {
    if (!session?.user?.id || !newBookingSlot || !therapistId || !therapist)
      return;
    if (therapist.venue === "both" && !selectedVenue) {
      toast.error("Select venue.");
      return;
    }

    setBookingInProgress(true);
    try {
      if (isRequestMode) {
        // NEW: Send appointment request via new API
        const res = await fetch("/api/appointment/requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            specialistId: therapistId,
            startTime: newBookingSlot.start.toISOString(),
            endTime: newBookingSlot.end.toISOString(),
            venue: selectedVenue,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to send request.");

        toast.success("Appointment request sent to specialist for approval.");
        // NEW: Redirect to chat using returned conversationId
        router.push(`/messages/${data.conversationId}`); // Adjust path to your chat route
      } else {
        // Existing: Direct booking
        const res = await fetch("/api/specialists/booking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            specialistId: therapistId,
            userId: session.user.id,
            startTime: newBookingSlot.start.toISOString(),
            endTime: newBookingSlot.end.toISOString(),
            venue: selectedVenue,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Booking failed.");

        toast.success("Booked!");

        const newBooking: BookedEvent = {
          id: `temp-${Date.now()}`,
          title: "Booked",
          start: newBookingSlot.start,
          end: newBookingSlot.end,
        };
        setBookedEvents((prev) => [...prev, newBooking]);
      }

      setIsDialogOpen(false);
      setNewBookingSlot(null);
      if (therapist.venue === "both") setSelectedVenue(undefined);
    } catch (error: any) {
      toast.error(
        error.message ||
          (isRequestMode ? "Failed to send request." : "Booking failed.")
      );
    } finally {
      setBookingInProgress(false);
    }
  };

  // SHOW ALL 24 HOURS (unchanged)
  const { min, max } = useMemo(() => {
    const today = new Date();
    const base = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    return {
      min: new Date(base.setHours(0, 0, 0, 0)),
      max: new Date(base.setHours(23, 59, 59, 999)),
    };
  }, []);

  const slotPropGetter = useCallback(
    (date: Date) => {
      const day = date.getDay();
      const hour = date.getHours();
      const minute = date.getMinutes();
      const slotMins = hour * 60 + minute;

      const dayBlocks = workingHours.filter((w) => w.dayOfWeek === day);

      if (dayBlocks.length === 0) {
        return {
          className: "rbc-slot-unavailable",
          style: { backgroundColor: "#e5e5e5", opacity: 0.6 },
        };
      }

      const isAvailable = dayBlocks.some((block) => {
        const [sh, sm] = block.startTime.split(":").map(Number);
        const [eh, em] = block.endTime.split(":").map(Number);
        const startMins = sh * 60 + sm;
        const endMins = eh * 60 + em;
        return slotMins >= startMins && slotMins < endMins;
      });

      if (!isAvailable) {
        return {
          className: "rbc-slot-outside",
          style: { backgroundColor: "#f0f0f0" },
        };
      }

      return { style: { backgroundColor: "#ffffff" } };
    },
    [workingHours]
  );

  const eventPropGetter = useCallback((event: BookedEvent) => {
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

  const durationMinutes = newBookingSlot
    ? differenceInMinutes(newBookingSlot.end, newBookingSlot.start)
    : 0;
  const durationHours = durationMinutes / 60;
  const totalRate =
    therapist && durationHours > 0 ? therapist.rate * durationHours : 0;

  if (status === "loading" || !therapist) {
    return (
      <div className="p-4">
        <Skeleton className="h-[70vh] w-full" />
      </div>
    );
  }
  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  return (
    <motion.div
      className="p-4 space-y-6 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl text-black">
            Book with {therapist.name}
          </CardTitle>
          <p className="text-sm text-black">
            Click for 1-hour, drag for custom. 30-min buffer added. Slots within
            24 hours require specialist approval.
          </p>{" "}
          {/* UPDATED: Added note about 24h rule */}
        </CardHeader>
      </Card>

      <Card className="shadow-lg">
        <CardContent className="pt-6">
          {loading ? (
            <Skeleton className="h-[70vh] w-full" />
          ) : (
            <BigCalendar
              localizer={localizer}
              events={bookedEvents}
              defaultView="week"
              views={["week", "day"]}
              date={currentDate}
              onNavigate={handleNavigate}
              onSelectSlot={handleSelectSlot}
              selectable
              step={30}
              timeslots={2}
              style={{ height: "70vh" }}
              min={min}
              max={max}
              slotPropGetter={slotPropGetter}
              eventPropGetter={eventPropGetter}
            />
          )}

          <div className="mt-4 text-sm text-gray-600">
            <p>
              <strong>Legend:</strong>
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-white border border-[#B0B0B0] mr-2"></div>
                Available
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-[#D4A5A5] border border-[#B0B0B0] mr-2"></div>
                Booked
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-[#E0D5D5] border border-[#D4A5A5] mr-2"></div>
                Buffer (30 min)
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-[#f0f0f0] mr-2"></div>
                Outside Working Hours
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-[#e5e5e5] mr-2"></div>
                No Availability Set
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Confirm Appointment</DialogTitle>
            {/* UPDATED: Dynamic description based on mode */}
            <DialogDescription>
              {isRequestMode
                ? "This slot is within 24 hours—request will be sent for specialist approval."
                : "Review booking details."}
            </DialogDescription>
          </DialogHeader>
          {newBookingSlot && therapist && (
            <div className="py-4 space-y-4">
              <div>
                <p className="font-medium">Specialist: {therapist.name}</p>
                <p>
                  <strong>Date:</strong>{" "}
                  {format(newBookingSlot.start, "MMMM d, yyyy")}
                </p>
                <p>
                  <strong>Time:</strong>{" "}
                  {format(newBookingSlot.start, "h:mm a")} –{" "}
                  {format(newBookingSlot.end, "h:mm a")}
                </p>
                <p>
                  <strong>Duration:</strong> {durationHours} hour
                  {durationHours !== 1 ? "s" : ""}
                </p>
                <p className="font-semibold text-lg">
                  Total: ${totalRate.toFixed(2)}
                  <span className="text-sm font-normal text-gray-600 ml-1">
                    ({durationHours} × ${therapist.rate}/hr)
                  </span>
                </p>
              </div>

              {therapist.venue === "both" && (
                <div>
                  <label htmlFor="venue-select" className="text-sm font-medium">
                    Venue
                  </label>
                  <Select
                    onValueChange={(v: "host" | "visit") => setSelectedVenue(v)}
                    value={selectedVenue}
                  >
                    <SelectTrigger id="venue-select" className="w-full mt-1">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="host">Specialist hosts</SelectItem>
                      <SelectItem value="visit">Specialist visits</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            {/* UPDATED: Dynamic button text and handler */}
            <Button
              onClick={handleConfirmAction}
              className="bg-[#F3CFC6] hover:bg-[#C4C4C4] text-black"
              disabled={
                bookingInProgress ||
                (therapist.venue === "both" && !selectedVenue)
              }
            >
              {bookingInProgress
                ? "Processing..."
                : isRequestMode
                  ? "Send Request"
                  : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default BookingPage;
