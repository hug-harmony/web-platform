"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";

type CalendarValue = Date | undefined;

const BookingPage: React.FC = () => {
  const { data: session, status } = useSession();
  const [selectedDate, setSelectedDate] = useState<CalendarValue>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);

  const times: string[] = [
    "7:00 AM",
    "8:00 AM",
    "9:00 AM",
    "10:00 AM",
    "11:00 AM",
    "12:00 PM",
    "1:00 PM",
    "2:00 PM",
    "3:00 PM",
    "4:00 PM",
    "5:00 PM",
    "6:00 PM",
  ];

  const handleDateChange = (value: CalendarValue) => {
    setSelectedDate(value);
    setSelectedTime(null);
    setError("");
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setError("");
  };

  const handleBookSession = async () => {
    if (!session) {
      setError("Please log in to book a session.");
      return;
    }
    if (!selectedDate || !selectedTime) {
      setError("Please select a date and time.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Mock delay
      setSuccess(
        `✅ Booked for ${format(selectedDate, "MMMM d, yyyy")} at ${selectedTime}`
      );
      setIsDialogOpen(false);
      setSelectedTime(null);
      toast.success("success");
    } catch {
      setError("Booking failed. Try again.");
      toast.error("failed");
    } finally {
      setLoading(false);
      setIsDialogOpen(false);
    }
  };

  const handleDialogOpen = () => {
    setIsDialogOpen(true);
  };

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  return (
    <div className="h-screen w-full  flex items-center justify-center">
      <Card className="w-full max-w-4xl rounded-3xl p-2 border border-gray-200 gap-4">
        <CardHeader>
          <CardTitle className="text-center text-3xl font-extrabold text-[#333] mt-4">
            Book Your Therapy Session
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 sm:p-6">
          <div className="flex flex-col lg:flex-row justify-between gap-4">
            {/* Calendar Section */}
            <div className="flex-1 flex justify-center items-start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateChange}
                className="rounded-md border shadow-sm "
                disabled={(date: Date) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const d = new Date(date);
                  d.setHours(0, 0, 0, 0);
                  return d < today;
                }}
              />
            </div>

            {/* Time Section */}
            <div className="flex-1">
              <h3 className="text-md font-semibold mb-6 text-center">
                Select a Time Slot
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-10">
                {times.map((time) => (
                  <button
                    key={time}
                    onClick={() => handleTimeSelect(time)}
                    aria-label={`Select time slot ${time}`}
                    className={cn(
                      "py-4  rounded-xl border text-center font-medium transition",
                      selectedTime === time
                        ? "bg-[#E8C5BC] text-white"
                        : "bg-gray-100 hover:bg-gray-200"
                    )}
                  >
                    {time}
                  </button>
                ))}
              </div>

              <button
                onClick={handleDialogOpen}
                disabled={!selectedDate || !selectedTime || loading}
                className={cn(
                  "w-full py-4 text-xl rounded-xl font-bold transition",
                  selectedDate && selectedTime
                    ? "bg-[#E8C5BC] text-black hover:bg-[#ddb0a3]"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                )}
              >
                {loading ? "loading..." : "Continue"}
              </button>

              {error && (
                <p className="mt-4 text-red-600 text-center font-semibold">
                  {error}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog for Booking Confirmation */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Booking Confirmation</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>
              <strong>Name:</strong> {session?.user?.name || "John Doe"}
            </p>
            <p>
              <strong>Date:</strong>{" "}
              {selectedDate ? format(selectedDate, "MMMM d, yyyy") : "N/A"}
            </p>
            <p>
              <strong>Time:</strong> {selectedTime || "N/A"}
            </p>
            <p>
              <strong>Amount:</strong> $50.00
            </p>
          </div>
          <DialogFooter>
            <Button
              onClick={handleBookSession}
              className="bg-[#E8C5BC] text-black hover:bg-[#ddb0a3]"
            >
              Pay Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom Calendar Styles */}
      <style jsx global>{`
        .rdp {
          font-size: 1.2rem;
          padding: 1.5rem;
          transform: scale(1.3);
          transform-origin: top center;
          width: 100%;
          max-width: 400px;
        }
        .rdp-day {
          width: 2.5rem;
          height: 2.5rem;
          line-height: 2.5rem;
          font-size: 1.1rem;
        }
        .rdp-day:not(.rdp-day_disabled):hover {
          background-color: #f9e4e4 !important;
        }
        .rdp-day_selected,
        .rdp-day_selected:hover,
        .rdp-day_selected:focus,
        .rdp-day_selected:active {
          background-color: #ff0000 !important;
          color: white !important;
        }
      `}</style>
    </div>
  );
};

export default BookingPage;
