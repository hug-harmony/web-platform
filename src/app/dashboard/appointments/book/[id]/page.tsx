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
  getDay,
  getHours,
} from "date-fns";

// Add these styles to your global CSS file (e.g., app/globals.css)
/*
.rbc-timeslot-group { border-bottom: 1px solid #e0e0e0; }
.rbc-slot-disabled { background-color: #f5f5f5 !important; cursor: not-allowed; }
.rbc-event { background-color: #e0e0e0 !important; border: 1px solid #bdbdbd !important; color: #424242 !important; border-radius: 4px; }
.rbc-time-slot { min-height: 40px; }
.rbc-day-slot .rbc-time-slot { border-top: 1px solid #f0f0f0; }
*/

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

interface WorkingHours {
  dayOfWeek: number; // 0 for Sunday, 1 for Monday, etc.
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
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
  const [workingHours, setWorkingHours] = useState<WorkingHours[]>([]);
  const [newBookingSlot, setNewBookingSlot] = useState<NewBookingSlot | null>(
    null
  );
  const [selectedVenue, setSelectedVenue] = useState<
    "host" | "visit" | undefined
  >(undefined);

  useEffect(() => {
    if (!therapistId) return;
    const fetchTherapist = async () => {
      try {
        const res = await fetch(`/api/specialists?id=${therapistId}`);
        if (!res.ok) throw new Error("Failed to fetch specialist details");
        const data = await res.json();
        setTherapist(data);
        if (data.venue !== "both") {
          setSelectedVenue(data.venue);
        }
      } catch (error) {
        toast.error((error as Error).message);
      }
    };
    fetchTherapist();
  }, [therapistId]);

  const fetchSchedule = useCallback(
    async (date: Date) => {
      if (!therapistId) return;
      setLoading(true);

      const start = startOfWeek(date, { weekStartsOn: 1 }); // Monday
      const end = endOfWeek(date, { weekStartsOn: 1 });

      try {
        const res = await fetch(
          `/api/specialists/schedule?specialistId=${therapistId}&startDate=${format(start, "yyyy-MM-dd")}&endDate=${format(end, "yyyy-MM-dd")}`
        );
        if (!res.ok) throw new Error("Failed to load schedule data.");

        const { events, workingHours: fetchedWorkingHours } = await res.json();

        setBookedEvents(
          events.map((e: any) => ({
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
    [therapistId]
  );

  useEffect(() => {
    fetchSchedule(currentDate);
  }, [currentDate, fetchSchedule]);

  const handleNavigate = (newDate: Date) => setCurrentDate(newDate);

  const handleSelectSlot = useCallback(
    (slotInfo: SlotInfo) => {
      if (isBefore(slotInfo.start, new Date())) return;

      const isOverlapping = bookedEvents.some(
        (event) => slotInfo.start < event.end && slotInfo.end > event.start
      );
      if (isOverlapping) {
        toast.warning("Selection overlaps with a booked slot.");
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
        toast.warning("Your 1-hour selection overlaps with a booked slot.");
        return;
      }

      setNewBookingSlot({ start: slotInfo.start, end: bookingEnd });
      setIsDialogOpen(true);
    },
    [bookedEvents]
  );

  const handleBookSession = async () => {
    if (!session?.user?.id || !newBookingSlot || !therapistId || !therapist)
      return;

    if (therapist.venue === "both" && !selectedVenue) {
      toast.error("Please select a venue for the session.");
      return;
    }

    setBookingInProgress(true);
    try {
      const response = await fetch("/api/specialists/booking", {
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

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Booking failed.");

      toast.success("Booking confirmed!");
      setIsDialogOpen(false);
      fetchSchedule(currentDate); // Refresh calendar with new booking
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBookingInProgress(false);
      // Reset state after dialog closes
      setTimeout(() => {
        setNewBookingSlot(null);
        if (therapist.venue === "both") setSelectedVenue(undefined);
      }, 300);
    }
  };

  const slotPropGetter = useCallback(
    (date: Date) => {
      const day = getDay(date); // 0=Sun, 1=Mon
      const hour = getHours(date);

      const dayWorkingHours = workingHours.find((wh) => wh.dayOfWeek === day);

      if (!dayWorkingHours) return { className: "rbc-slot-disabled" };

      const startHour = parseInt(dayWorkingHours.startTime.split(":")[0], 10);
      const endHour = parseInt(dayWorkingHours.endTime.split(":")[0], 10);

      if (hour < startHour || hour >= endHour)
        return { className: "rbc-slot-disabled" };

      return {};
    },
    [workingHours]
  );

  const { min, max } = useMemo(
    () => ({
      min: moment().startOf("day").add(8, "hours").toDate(), // 8 AM
      max: moment().startOf("day").add(20, "hours").toDate(), // 8 PM
    }),
    []
  );

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
            Click an empty slot for a 1-hour session, or click and drag to
            select a custom duration.
          </p>
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
            />
          )}
          <div className="mt-4 text-sm text-gray-600">
            <p>
              <strong>Legend:</strong>
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-white border mr-2"></div>Available
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-[#e0e0e0] mr-2"></div>Booked
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-[#f5f5f5] mr-2"></div>Outside Working
                Hours
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Confirm Your Appointment</DialogTitle>
            <DialogDescription>
              Review the details below before confirming.
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
                  {format(newBookingSlot.start, "h:mm a")} -{" "}
                  {format(newBookingSlot.end, "h:mm a")}
                </p>
              </div>

              {therapist.venue === "both" && (
                <div>
                  <label htmlFor="venue-select" className="text-sm font-medium">
                    Venue
                  </label>
                  <Select
                    onValueChange={(value: "host" | "visit") =>
                      setSelectedVenue(value)
                    }
                    value={selectedVenue}
                  >
                    <SelectTrigger id="venue-select" className="w-full mt-1">
                      <SelectValue placeholder="Select where to meet..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="host">Specialist will host</SelectItem>
                      <SelectItem value="visit">
                        Specialist will visit you
                      </SelectItem>
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
            <Button
              onClick={handleBookSession}
              className="bg-[#F3CFC6] hover:bg-[#C4C4C4] text-black"
              disabled={
                bookingInProgress ||
                (therapist?.venue === "both" && !selectedVenue)
              }
            >
              {bookingInProgress ? "Confirming..." : "Confirm Booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default BookingPage;
