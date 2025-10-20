"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { format, parse, startOfToday } from "date-fns";
import { toast } from "sonner";
import { useRouter, useParams } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Calendar as BigCalendar,
  momentLocalizer,
  SlotInfo,
} from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import debounce from "lodash.debounce"; // Install lodash for debounce

interface Therapist {
  _id: string;
  name: string;
  rate: number;
}

interface TimeSlot {
  time: string;
  formattedTime: string;
  available: boolean;
}

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, staggerChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

const localizer = momentLocalizer(moment);

const BookingPage: React.FC = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id: therapistId } = useParams();
  const [therapist, setTherapist] = useState<Therapist | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [breakDuration, setBreakDuration] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [disabledDates, setDisabledDates] = useState<Set<string>>(new Set());
  const [hasNoAvailability, setHasNoAvailability] = useState(false);
  const [availabilityCache, setAvailabilityCache] = useState<
    Map<string, { slots: TimeSlot[]; breakDuration: number | null }>
  >(new Map());
  const [currentViewDate, setCurrentViewDate] = useState<Date>(new Date());

  const fetchData = useCallback(async () => {
    if (!therapistId || !selectedDate) {
      toast.error("No therapist or date selected");
      return;
    }

    const dateStr = format(selectedDate, "yyyy-MM-dd");
    setLoading(true);
    try {
      if (availabilityCache.has(dateStr)) {
        const cached = availabilityCache.get(dateStr)!;
        setTimeSlots(cached.slots);
        setBreakDuration(cached.breakDuration);
        setLoading(false);
        return;
      }

      const [therapistRes, bookingsRes] = await Promise.all([
        fetch(`/api/specialists?id=${therapistId}`, {
          cache: "no-store",
          credentials: "include",
        }),
        fetch(
          `/api/specialists/booking?specialistId=${therapistId}&date=${dateStr}`,
          { cache: "no-store", credentials: "include" }
        ),
      ]);

      if (!therapistRes.ok || !bookingsRes.ok) {
        if (therapistRes.status === 401 || bookingsRes.status === 401) {
          router.push("/login");
        }
        throw new Error(
          `Failed to fetch data: Therapist(${therapistRes.status}), Bookings(${bookingsRes.status})`
        );
      }

      const therapistData = await therapistRes.json();
      const bookingsData = await bookingsRes.json();

      setTherapist({
        _id: therapistData.id,
        name: therapistData.name,
        rate: therapistData.rate || 50,
      });
      setTimeSlots(bookingsData.slots || []);
      setBreakDuration(bookingsData.breakDuration || null);

      setAvailabilityCache((prev) => {
        const newCache = new Map(prev);
        newCache.set(dateStr, {
          slots: bookingsData.slots || [],
          breakDuration: bookingsData.breakDuration || null,
        });
        return newCache;
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to load therapist or time slots";
      console.error("Fetch error:", errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [therapistId, selectedDate, router, availabilityCache]);

  const debouncedFetchAvailability = useCallback(
    debounce(async (month: Date) => {
      if (!therapistId) return;

      const start = moment(month).startOf("month").toDate();
      const end = moment(month).endOf("month").toDate();

      try {
        const res = await fetch(
          `/api/specialists/availability/range?specialistId=${therapistId}&startDate=${format(start, "yyyy-MM-dd")}&endDate=${format(end, "yyyy-MM-dd")}`,
          { cache: "no-store", credentials: "include" }
        );

        if (res.ok) {
          const data = await res.json();
          const disabled = new Set<string>();
          let hasAvailableSlots = false;

          data.availabilities.forEach(
            (avail: { date: string; slots: { available: boolean }[] }) => {
              const hasAvailable = avail.slots.some((slot) => slot.available);
              if (!hasAvailable) {
                disabled.add(avail.date);
              } else {
                hasAvailableSlots = true;
              }
            }
          );

          setDisabledDates(disabled);
          setHasNoAvailability(!hasAvailableSlots);
        } else {
          const errorData = await res.json();
          throw new Error(errorData.error || "Failed to fetch availability");
        }
      } catch (error) {
        console.error("Bulk availability fetch error:", error);
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to fetch availability for the month"
        );
      }
    }, 300), // Debounce for 300ms
    [therapistId]
  );

  useEffect(() => {
    // Initial fetch on mount (once)
    debouncedFetchAvailability(currentViewDate);

    return () => {
      debouncedFetchAvailability.cancel(); // Clean up debounce on unmount
    };
  }, [debouncedFetchAvailability, currentViewDate]); // Removed therapistId to avoid extra calls

  useEffect(() => {
    // Auto-select today if available (after disabledDates is set)
    const todayStr = format(new Date(), "yyyy-MM-dd");
    if (!selectedDate && !disabledDates.has(todayStr)) {
      setSelectedDate(new Date());
    }
  }, [disabledDates, selectedDate]);

  useEffect(() => {
    if (selectedDate) {
      fetchData();
    }
  }, [selectedDate, fetchData]);

  const handleNavigate = (newDate: Date) => {
    // Only update and fetch if month/year actually changed
    if (
      moment(newDate).month() !== moment(currentViewDate).month() ||
      moment(newDate).year() !== moment(currentViewDate).year()
    ) {
      setCurrentViewDate(newDate);
    }
  };

  const handleSelectSlot = (slotInfo: SlotInfo) => {
    const clickedDate = new Date(slotInfo.start); // Removed zonedTimeToUtc (not needed if backend is UTC-consistent)
    // If you need timezone conversion, uncomment and ensure date-fns-tz is installed correctly:
    // const { zonedTimeToUtc } = await import('date-fns-tz');
    // const clickedDate = zonedTimeToUtc(slotInfo.start, "UTC");

    const today = startOfToday();

    if (clickedDate < today) return;

    const dateStr = format(clickedDate, "yyyy-MM-dd");
    if (disabledDates.has(dateStr)) return;

    setSelectedDate(clickedDate);
    setSelectedTime(null);
  };

  const dayPropGetter = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const today = startOfToday();

    if (date < today) {
      return {
        className: "rbc-day-bg bg-gray-200 text-gray-400 cursor-not-allowed",
      };
    }
    if (disabledDates.has(dateStr)) {
      return {
        className: "rbc-day-bg bg-gray-300 text-gray-500 cursor-not-allowed",
      };
    }
    if (selectedDate && dateStr === format(selectedDate, "yyyy-MM-dd")) {
      return { className: "rbc-day-bg bg-[#F3CFC6] text-black" };
    }
    return { className: "rbc-day-bg bg-green-100 cursor-pointer" };
  };

  const handleBookSession = async () => {
    if (
      !session?.user?.id ||
      !selectedDate ||
      !selectedTime ||
      !therapist ||
      !therapistId
    ) {
      toast.error("Please log in and select a therapist, date, and time");
      return;
    }

    setLoading(true);
    try {
      const selectedDateTimeStr = `${format(selectedDate, "yyyy-MM-dd")} ${selectedTime}`;
      const selectedDateTime = parse(
        selectedDateTimeStr,
        "yyyy-MM-dd h:mm a",
        new Date()
      );
      if (isNaN(selectedDateTime.getTime())) {
        throw new Error("Invalid date/time format");
      }

      const now = new Date();
      const timeDifference =
        (selectedDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (timeDifference > 24) {
        const response = await fetch("/api/specialists/booking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            specialistId: therapistId,
            date: format(selectedDate, "yyyy-MM-dd"),
            time: selectedTime,
            userId: session.user.id,
          }),
          credentials: "include",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              data.error ||
              `Booking failed with status ${response.status}`
          );
        }

        const bookingId = data?.appointment?.id;
        if (!bookingId) {
          throw new Error("Booking ID not found in response");
        }

        toast.success("Booking confirmed");
        router.push(`/dashboard/appointments/confirm/${bookingId}`);
      } else {
        const specialistUserRes = await fetch(
          `/api/specialists/${therapistId}/user`,
          {
            cache: "no-store",
            credentials: "include",
          }
        );
        const specialistUser = await specialistUserRes.json();
        if (!specialistUserRes.ok || !specialistUser.userId) {
          throw new Error("Failed to fetch specialist details");
        }

        const convResponse = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recipientId: specialistUser.userId }),
          credentials: "include",
        });

        const convData = await convResponse.json();
        if (!convResponse.ok) {
          throw new Error(
            convData.error || "Failed to create/find conversation"
          );
        }

        const conversationId = convData.id;
        if (!conversationId) {
          throw new Error("Conversation ID not found");
        }

        const proposalResponse = await fetch("/api/proposals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId,
            specialistId: therapistId,
            date: format(selectedDate, "yyyy-MM-dd"),
            time: selectedTime,
          }),
          credentials: "include",
        });

        const proposalData = await proposalResponse.json();
        if (!proposalResponse.ok) {
          throw new Error(
            proposalData.error || "Failed to send appointment request"
          );
        }

        toast.success("Appointment request sent to specialist for approval");
        setIsDialogOpen(false);
        router.push(`/dashboard/messaging/${conversationId}`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message.includes("SLOT_NOT_AVAILABLE")
            ? "Selected time slot is no longer available"
            : error.message.includes("SLOT_ALREADY_BOOKED")
              ? "Selected time slot is already booked"
              : error.message
          : "Booking failed";
      console.error("Booking error:", errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
      setIsDialogOpen(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <motion.div
        className="p-4 space-y-6 max-w-7xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
          <CardHeader>
            <motion.div variants={itemVariants}>
              <CardTitle className="text-2xl text-black dark:text-white">
                Book Appointment
              </CardTitle>
              <p className="text-sm text-black">Schedule your session</p>
            </motion.div>
          </CardHeader>
          <CardContent className="flex space-x-4">
            <Skeleton className="h-10 w-40 rounded-full bg-[#C4C4C4]/50" />
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader>
            <Skeleton className="h-8 w-48 bg-[#C4C4C4]/50" />
          </CardHeader>
          <CardContent className="flex flex-col gap-4 pt-6">
            <Skeleton className="h-64 w-full bg-[#C4C4C4]/50" />
            <div className="flex-1 space-y-4">
              <Skeleton className="h-8 w-48 bg-[#C4C4C4]/50" />
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full bg-[#C4C4C4]/50" />
                ))}
              </div>
              <Skeleton className="h-10 w-full bg-[#C4C4C4]/50" />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  if (!therapistId) {
    router.push("/dashboard");
    return null;
  }

  if (hasNoAvailability) {
    return (
      <motion.div
        className="p-4 space-y-6 max-w-7xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
          <CardHeader>
            <motion.div variants={itemVariants}>
              <CardTitle className="text-2xl text-black dark:text-white">
                Book Appointment with {therapist?.name}
              </CardTitle>
              <p className="text-sm text-[#C4C4C4]">Schedule your session</p>
            </motion.div>
          </CardHeader>
          <CardContent className="flex space-x-4">
            <motion.div
              variants={itemVariants}
              whileHover={{
                scale: 1.05,
                boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
              }}
              transition={{ duration: 0.2 }}
            >
              <Button
                asChild
                variant="outline"
                className="text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20 rounded-full"
              >
                <Link href="/dashboard">
                  <MessageSquare className="mr-2 h-4 w-4 text-[#F3CFC6]" />
                  Back to Dashboard
                </Link>
              </Button>
            </motion.div>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardContent className="flex items-center justify-center pt-6">
            <p className="text-[#C4C4C4]">
              No available time slots for {therapist?.name} in this month.
              Navigate to another month or try another therapist.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <TooltipProvider>
      <motion.div
        className="p-4 space-y-6 max-w-7xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
          <CardHeader>
            <motion.div variants={itemVariants}>
              <CardTitle className="text-2xl text-black dark:text-white">
                Book Appointment with {therapist?.name}
              </CardTitle>
              <p className="text-sm text-[#C4C4C4]">
                Schedule your session
                {breakDuration !== null &&
                  ` (Appointments have a ${breakDuration}-minute break between them)`}
              </p>
            </motion.div>
          </CardHeader>
          <CardContent className="flex space-x-4">
            <motion.div variants={itemVariants} whileHover={{ scale: 1.05 }}>
              <Button
                asChild
                variant="outline"
                className="text-[#F3CFC6] border-[#F3CFC6] rounded-full"
              >
                <Link href="/dashboard">
                  <MessageSquare className="mr-2 h-4 w-4 text-[#F3CFC6]" />
                  Back to Dashboard
                </Link>
              </Button>
            </motion.div>
          </CardContent>
        </Card>

        {/* Booking Section */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-black dark:text-white">
              Select Date and Time
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 pt-6">
            {/* react-big-calendar */}
            <motion.div variants={itemVariants} className="w-full">
              <BigCalendar
                localizer={localizer}
                defaultView="month"
                views={["month"]}
                date={currentViewDate}
                onNavigate={handleNavigate}
                selectable={true}
                onSelectSlot={handleSelectSlot}
                style={{ height: 500 }}
                min={new Date()} // Prevent past dates
                dayPropGetter={dayPropGetter}
                events={[]} // No events needed for booking view
              />
              <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                <p>
                  <strong>Legend:</strong>
                </p>
                <div className="flex space-x-4">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-green-100 border mr-2"></div>
                    Available
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-gray-300 mr-2"></div>
                    Unavailable
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-gray-200 mr-2"></div>
                    Past
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-[#F3CFC6] mr-2"></div>
                    Selected
                  </div>
                </div>
                <p className="mt-2">
                  Past and unavailable dates cannot be selected.
                </p>
              </div>
            </motion.div>

            {/* Time Slots */}
            <div className="flex-1">
              <h3 className="text-md font-semibold mb-4 text-center text-black dark:text-white">
                Select Time for{" "}
                {selectedDate
                  ? format(selectedDate, "MMMM d, yyyy")
                  : "Selected Date"}
              </h3>
              {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full bg-[#C4C4C4]/50" />
                  ))}
                </div>
              ) : (
                <motion.div
                  variants={itemVariants}
                  className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mb-4 max-h-40 overflow-y-auto"
                >
                  {timeSlots.length > 0 ? (
                    timeSlots.map((slot) => (
                      <Tooltip key={slot.time}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() =>
                              slot.available && setSelectedTime(slot.time)
                            }
                            disabled={!slot.available}
                            className={cn(
                              "py-2 rounded border text-center",
                              selectedTime === slot.time
                                ? "bg-[#F3CFC6] text-black dark:text-white"
                                : slot.available
                                  ? "bg-white dark:bg-gray-800 text-black dark:text-white border-[#F3CFC6] hover:bg-[#F3CFC6]/20"
                                  : "bg-gray-300 text-gray-500 border-gray-300 cursor-not-allowed"
                            )}
                            aria-label={`Select time ${slot.formattedTime}${slot.available ? "" : " (Unavailable)"}`}
                          >
                            {slot.formattedTime}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {slot.available
                            ? "Available"
                            : "Unavailable (booked or break)"}
                        </TooltipContent>
                      </Tooltip>
                    ))
                  ) : (
                    <p className="text-center text-gray-500 col-span-full">
                      No time slots available for this date.
                    </p>
                  )}
                </motion.div>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.div>
                    <Button
                      onClick={() => setIsDialogOpen(true)}
                      disabled={!selectedDate || !selectedTime || loading}
                      className="w-full py-2 bg-[#F3CFC6] hover:bg-[#C4C4C4] text-black dark:text-white rounded-full"
                    >
                      Continue
                    </Button>
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent>
                  {!selectedDate || !selectedTime
                    ? "Select a date and time first"
                    : "Ready to confirm"}
                </TooltipContent>
              </Tooltip>
            </div>
          </CardContent>
        </Card>

        {/* Confirm Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="bg-white dark:bg-gray-800">
            <DialogTitle className="text-black dark:text-white">
              Confirm Booking
            </DialogTitle>
            <div className="py-2 space-y-2">
              <p className="text-black dark:text-white">
                <strong>Name:</strong> {session?.user?.name || "N/A"}
              </p>
              <p className="text-black dark:text-white">
                <strong>Date:</strong>{" "}
                {selectedDate ? format(selectedDate, "MMMM d, yyyy") : "N/A"}
              </p>
              <p className="text-black dark:text-white">
                <strong>Time:</strong> {selectedTime || "N/A"}
              </p>
              <p className="text-black dark:text-white">
                <strong>Amount:</strong> $
                {therapist?.rate?.toFixed(2) || "50.00"}
              </p>
              {breakDuration !== null && (
                <p className="text-black dark:text-white">
                  <strong>Break Duration:</strong> {breakDuration} minutes
                  between appointments
                </p>
              )}
            </div>
            <DialogFooter>
              <Button
                onClick={handleBookSession}
                className="bg-[#F3CFC6] hover:bg-[#C4C4C4] text-black dark:text-white rounded-full"
                disabled={loading}
              >
                {loading ? "Loading..." : "Confirm"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    </TooltipProvider>
  );
};

export default BookingPage;
