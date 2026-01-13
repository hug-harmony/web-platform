// src/app/dashboard/appointments/book/[id]/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
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
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
} from "date-fns";
import { Video, MapPin, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Professional {
  _id: string;
  name: string;
  rate: number;
  offersVideo?: boolean;
  videoRate?: number;
  venue: "host" | "visit" | "both";
  image?: string;
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

type VenueType = "host" | "visit" | "video";

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const localizer = momentLocalizer(moment);

export default function BookingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const professionalId = params.id as string;
  const isVideoBooking = searchParams.get("type") === "video";

  // State
  const [professional, setProfessional] = useState<Professional | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookedEvents, setBookedEvents] = useState<BookedEvent[]>([]);
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>([]);
  const [newBookingSlot, setNewBookingSlot] = useState<NewBookingSlot | null>(
    null
  );
  const [selectedVenue, setSelectedVenue] = useState<VenueType | undefined>(
    isVideoBooking ? "video" : undefined
  );
  const [isRequestMode, setIsRequestMode] = useState(false);

  // Fetch professional data
  useEffect(() => {
    if (!professionalId) return;

    const fetchProfessional = async () => {
      try {
        const res = await fetch(`/api/professionals?id=${professionalId}`);
        if (!res.ok) throw new Error("Failed to fetch professional");
        const data = await res.json();
        setProfessional(data);

        // Set default venue if professional only offers one option and not video booking
        if (!isVideoBooking && data.venue !== "both") {
          setSelectedVenue(data.venue);
        }
      } catch (error) {
        toast.error((error as Error).message);
        router.push("/dashboard/professionals");
      }
    };

    fetchProfessional();
  }, [professionalId, isVideoBooking, router]);

  // Fetch schedule
  const fetchSchedule = useCallback(
    async (date: Date) => {
      if (!professionalId) return;
      setLoading(true);

      const start = startOfWeek(date, { weekStartsOn: 1 });
      const end = endOfWeek(date, { weekStartsOn: 1 });

      try {
        const res = await fetch(
          `/api/professionals/schedule?professionalId=${professionalId}&startDate=${format(start, "yyyy-MM-dd")}&endDate=${format(end, "yyyy-MM-dd")}`
        );

        if (!res.ok) throw new Error("Failed to load schedule.");

        const { events, workingHours: fetched } = await res.json();

        setBookedEvents(
          events.map((e: BookedEvent) => ({
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
    [professionalId]
  );

  useEffect(() => {
    fetchSchedule(currentDate);
  }, [currentDate, fetchSchedule]);

  // Calendar navigation
  const handleNavigate = (newDate: Date) => setCurrentDate(newDate);

  // Slot selection handler
  const handleSelectSlot = useCallback(
    (slotInfo: SlotInfo) => {
      // Block past dates
      if (isBefore(slotInfo.start, new Date())) {
        toast.warning("Cannot select past time.");
        return;
      }

      // Helper: check if time is within working hours
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

      // Calculate start and end times
      const start = slotInfo.start;
      const isClick = moment(start).isSame(moment(slotInfo.end), "minute");
      const end = isClick ? addHours(start, 1) : slotInfo.end;

      // Check every 30-min step in selection
      let current = new Date(start);
      while (current < end) {
        if (!isTimeAvailable(current)) {
          toast.warning("Selection includes unavailable time.");
          return;
        }
        current = addMinutes(current, 30);
      }

      // Check for overlaps with booked events
      const overlaps = bookedEvents.some((e) => start < e.end && end > e.start);
      if (overlaps) {
        toast.warning("Overlaps with booked session or buffer.");
        return;
      }

      // Valid selection
      setNewBookingSlot({ start, end });

      // Check if within 24 hours (request mode)
      const twentyFourHoursFromNow = addHours(new Date(), 24);
      setIsRequestMode(isBefore(start, twentyFourHoursFromNow));

      setIsDialogOpen(true);
    },
    [bookedEvents, workingHours]
  );

  // Confirmation handler
  const handleConfirmAction = async () => {
    if (
      !session?.user?.id ||
      !newBookingSlot ||
      !professionalId ||
      !professional
    ) {
      return;
    }

    // Validate venue selection
    if (!selectedVenue) {
      toast.error("Please select a session type.");
      return;
    }

    setBookingInProgress(true);

    try {
      // Handle video session booking
      if (selectedVenue === "video") {
        const res = await fetch("/api/video/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            professionalId,
            scheduledStart: newBookingSlot.start.toISOString(),
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to create video session.");
        }

        toast.success("Video session scheduled!");
        setIsDialogOpen(false);
        setNewBookingSlot(null);
        router.push("/dashboard/video-session");
        return;
      }

      // Handle request mode (within 24 hours)
      if (isRequestMode) {
        const res = await fetch("/api/appointment/requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            professionalId,
            startTime: newBookingSlot.start.toISOString(),
            endTime: newBookingSlot.end.toISOString(),
            venue: selectedVenue,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to send request.");
        }

        toast.success("Appointment request sent to professional for approval.");

        // Navigate to messaging if conversation exists
        if (data.conversationId) {
          router.push(`/dashboard/messaging/${data.conversationId}`);
        } else {
          router.push("/dashboard/appointments");
        }

        setIsDialogOpen(false);
        setNewBookingSlot(null);
        return;
      }

      // Handle regular booking
      const res = await fetch("/api/professionals/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          professionalId,
          userId: session.user.id,
          startTime: newBookingSlot.start.toISOString(),
          endTime: newBookingSlot.end.toISOString(),
          venue: selectedVenue,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.error || "Booking failed.");
      }

      toast.success("Appointment booked successfully!");
      await fetchSchedule(currentDate);

      setIsDialogOpen(false);
      setNewBookingSlot(null);

      if (professional.venue === "both" && !isVideoBooking) {
        setSelectedVenue(undefined);
      }
    } catch (error) {
      toast.error((error as Error).message || "Something went wrong.");
    } finally {
      setBookingInProgress(false);
    }
  };

  // Calendar time range (show all 24 hours)
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

  // Slot styling
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

  // Event styling
  const eventPropGetter = useCallback((event: BookedEvent) => {
    if (event.title === "Blocked (Buffer)") {
      return {
        className: "border",
        style: {
          backgroundColor: "#E0D5D5",
          color: "transparent",
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

  // Calculate duration and price
  const durationMinutes = newBookingSlot
    ? differenceInMinutes(newBookingSlot.end, newBookingSlot.start)
    : 0;
  const durationHours = durationMinutes / 60;
  const totalRate =
    professional && durationHours > 0
      ? (isVideoBooking ? (professional.videoRate ?? professional.rate) : professional.rate) * durationHours
      : 0;

  // Determine if venue selection is needed
  const needsVenueSelection = useMemo(() => {
    if (isVideoBooking) return false; // Video is pre-selected
    if (!professional) return false;
    return professional.venue === "both";
  }, [professional, isVideoBooking]);

  // Loading state
  if (status === "loading" || !professional) {
    return (
      <div className="p-4 max-w-7xl mx-auto">
        <Skeleton className="h-32 w-full mb-6" />
        <Skeleton className="h-[70vh] w-full" />
      </div>
    );
  }

  // Redirect if not authenticated
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
      {/* Back Button */}
      <Button variant="ghost" asChild className="mb-2">
        <Link href={`/dashboard/profile/${professionalId}`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Profile
        </Link>
      </Button>

      {/* Header Card */}
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="text-2xl text-black flex items-center gap-2">
                {isVideoBooking && <Video className="h-6 w-6" />}
                Book with {professional.name}
              </CardTitle>
              <p className="text-sm text-black/70 mt-1">
                {isVideoBooking
                  ? "Schedule a video session"
                  : "Schedule an in-person appointment"}
              </p>
            </div>
            {isVideoBooking && (
              <Badge className="bg-blue-500 text-white">
                <Video className="h-3 w-3 mr-1" />
                Video Session
              </Badge>
            )}
          </div>
          <p className="text-sm text-black mt-2">
            Click for 1-hour, drag for custom duration. 30-min buffer added
            between sessions.
            {!isVideoBooking &&
              " Slots within 24 hours require professional approval."}
          </p>
        </CardHeader>
      </Card>

      {/* Calendar Card */}
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

          {/* Legend */}
          <div className="mt-4 text-sm text-gray-600">
            <p className="font-medium mb-2">Legend:</p>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-white border border-gray-300 mr-2 rounded" />
                Available
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-[#D4A5A5] border border-[#B0B0B0] mr-2 rounded" />
                Booked
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-[#E0D5D5] border border-[#D4A5A5] mr-2 rounded" />
                Buffer (30 min)
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-[#f0f0f0] mr-2 rounded" />
                Outside Working Hours
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-[#e5e5e5] mr-2 rounded" />
                No Availability Set
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-white dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedVenue === "video" && (
                <Video className="h-5 w-5 text-blue-500" />
              )}
              {selectedVenue === "video"
                ? "Confirm Video Session"
                : "Confirm Appointment"}
            </DialogTitle>
            <DialogDescription>
              {isRequestMode && selectedVenue !== "video"
                ? "This slot is within 24 hours — your request will be sent for professional approval."
                : "Please review the details below."}
            </DialogDescription>
          </DialogHeader>

          {newBookingSlot && professional && (
            <div className="py-4 space-y-4">
              {/* Booking Details */}
              <div className="space-y-2">
                <p className="font-medium text-lg">{professional.name}</p>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">Date:</span>
                    <p className="font-medium">
                      {format(newBookingSlot.start, "MMMM d, yyyy")}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Time:</span>
                    <p className="font-medium">
                      {format(newBookingSlot.start, "h:mm a")} –{" "}
                      {format(newBookingSlot.end, "h:mm a")}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Duration:</span>
                    <p className="font-medium">
                      {durationHours} hour{durationHours !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Rate:</span>
                    <p className="font-medium">${professional.rate}/hr</p>
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <p className="text-lg font-semibold">
                    Total: ${totalRate.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Session Type Selection */}
              {(needsVenueSelection || isVideoBooking) && (
                <div className="space-y-2">
                  <label htmlFor="venue-select" className="text-sm font-medium">
                    Session Type
                  </label>
                  <Select
                    value={selectedVenue}
                    onValueChange={(v: VenueType) => setSelectedVenue(v)}
                    disabled={isVideoBooking}
                  >
                    <SelectTrigger id="venue-select" className="w-full">
                      <SelectValue placeholder="Select session type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {!isVideoBooking && (
                        <>
                          <SelectItem value="host">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              In-Person (Professional&apos;s Location)
                            </div>
                          </SelectItem>
                          <SelectItem value="visit">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              In-Person (Your Location)
                            </div>
                          </SelectItem>
                        </>
                      )}
                      <SelectItem value="video">
                        <div className="flex items-center gap-2">
                          <Video className="h-4 w-4" />
                          Video Session
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Request Mode Notice */}
              {isRequestMode && selectedVenue !== "video" && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    ⏰ This time slot is within 24 hours. Your request will be
                    sent to the professional for approval.
                  </p>
                </div>
              )}

              {/* Video Session Notice */}
              {selectedVenue === "video" && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    📹 You&apos;ll receive a notification when it&apos;s time to
                    join the video call.
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                setNewBookingSlot(null);
              }}
              disabled={bookingInProgress}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmAction}
              className="bg-[#F3CFC6] hover:bg-[#e5c1b8] text-black"
              disabled={
                bookingInProgress || (!selectedVenue && needsVenueSelection)
              }
            >
              {bookingInProgress ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Processing...
                </span>
              ) : selectedVenue === "video" ? (
                "Schedule Video Session"
              ) : isRequestMode ? (
                "Send Request"
              ) : (
                "Confirm Booking"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
