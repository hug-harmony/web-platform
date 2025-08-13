"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";
import { useRouter, useParams } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

interface Therapist {
  _id: string;
  name: string;
  rate: number;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

// Animation variants
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

const BookingPage: React.FC = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id: therapistId } = useParams();
  const [therapist, setTherapist] = useState<Therapist | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date()
  );
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!therapistId) {
        toast.error("No therapist selected");
        return;
      }

      try {
        const [therapistRes, slotsRes] = await Promise.all([
          fetch(`/api/specialists?therapistId=${therapistId}`, {
            cache: "no-store",
            credentials: "include",
          }),
          fetch(
            `/api/specialists/booking?therapistId=${therapistId}&date=${selectedDate?.toISOString()}`,
            {
              cache: "no-store",
              credentials: "include",
            }
          ),
        ]);

        if (!therapistRes.ok || !slotsRes.ok) {
          if (therapistRes.status === 401 || slotsRes.status === 401) {
            router.push("/login");
          }
          throw new Error(
            `Failed to fetch data: Therapist(${therapistRes.status}), Slots(${slotsRes.status})`
          );
        }

        const therapistData = await therapistRes.json();
        const slotsData = await slotsRes.json();

        setTherapist({
          _id: therapistData.id,
          name: therapistData.name,
          rate: therapistData.rate || 50,
        });
        setTimeSlots(slotsData.slots || []);
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to load therapist or time slots";
        console.error("Fetch error:", errorMessage);
        toast.error(errorMessage);
      }
    };

    fetchData();
  }, [therapistId, selectedDate, router]);

  const handleBookSession = async () => {
    if (
      !session ||
      !session.user?.id ||
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
      const response = await fetch("/api/specialists/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          therapistId,
          date: selectedDate.toISOString(),
          time: selectedTime,
          userId: session.user.id,
        }),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || `Booking failed with status ${response.status}`
        );
      }

      const bookingId = data?.appointment?.id;
      if (!bookingId) {
        console.error("Booking ID missing in response:", data);
        throw new Error("Booking ID not found in response");
      }

      toast.success("Booking confirmed");
      router.push(`/dashboard/appointments/confirm/${bookingId}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Booking failed";
      console.error("Booking error:", errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
      setIsDialogOpen(false);
    }
  };

  if (status === "loading" || !therapist) {
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
          <CardContent className="flex flex-col lg:flex-row gap-4 pt-6">
            <Skeleton className="h-64 w-80 rounded-md bg-[#C4C4C4]/50" />
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
                className="text-[#F3CFC6] border-[#F3CFC6] hover:bg-white dark:hover:bg-white rounded-full"
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
              Please log in to book an appointment.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="p-4 space-y-6 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header Section */}
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
        <CardHeader>
          <motion.div variants={itemVariants}>
            <CardTitle className="text-2xl text-black dark:text-white">
              Book Appointment with {therapist.name}
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

      {/* Booking Section */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-black dark:text-white">
            Select Date and Time
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col lg:flex-row gap-4 pt-6">
          <motion.div variants={itemVariants}>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border border-[#F3CFC6]"
              disabled={(date: Date) =>
                new Date(date).setHours(0, 0, 0, 0) <
                new Date().setHours(0, 0, 0, 0)
              }
            />
          </motion.div>
          <div className="flex-1">
            <h3 className="text-md font-semibold mb-4 text-center text-black dark:text-white">
              Select Time
            </h3>
            <motion.div
              variants={itemVariants}
              className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4"
            >
              {timeSlots.map((slot) => (
                <button
                  key={slot.time}
                  onClick={() => slot.available && setSelectedTime(slot.time)}
                  disabled={!slot.available}
                  className={cn(
                    "py-2 rounded border text-center",
                    selectedTime === slot.time
                      ? "bg-[#F3CFC6] text-black dark:text-white"
                      : slot.available
                        ? "bg-white dark:bg-gray-800 text-black dark:text-white border-[#F3CFC6] hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20"
                        : "bg-gray-300 text-gray-500 border-gray-300 cursor-not-allowed"
                  )}
                >
                  {slot.time}
                </button>
              ))}
            </motion.div>
            <motion.div variants={itemVariants}>
              <Button
                onClick={() => setIsDialogOpen(true)}
                disabled={!selectedDate || !selectedTime || loading}
                className="w-full py-2 bg-[#F3CFC6] hover:bg-[#C4C4C4] text-black dark:text-white rounded-full"
              >
                Continue
              </Button>
            </motion.div>
          </div>
        </CardContent>
      </Card>

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
              <strong>Amount:</strong> ${therapist.rate?.toFixed(2) || "50.00"}
            </p>
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

      <style jsx global>{`
        .rdp {
          font-size: 1.1rem;
          padding: 1rem;
          max-width: 300px;
        }
        .rdp-day {
          width: 2rem;
          height: 2rem;
          line-height: 2rem;
        }
        .rdp-day:not(.rdp-day_disabled):hover {
          background-color: #f3cfc6;
        }
        .rdp-day_selected {
          background-color: #f3cfc6 !important;
          color: #000000 !important;
        }
      `}</style>
    </motion.div>
  );
};

export default BookingPage;
