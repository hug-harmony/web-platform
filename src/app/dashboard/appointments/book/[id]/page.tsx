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
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";
import { useRouter, useParams } from "next/navigation";

interface Therapist {
  _id: string;
  name: string;
  rate: number;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

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
        console.log("Therapist Response:", therapistData);
        console.log("Slots Response:", slotsData);

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
      console.log("Sending booking request:", {
        therapistId,
        date: selectedDate.toISOString(),
        time: selectedTime,
        userId: session.user.id,
      });

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
      console.log("Booking API Response:", JSON.stringify(data, null, 2));

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
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 ">
      <Card className="w-full max-w-7xl p-4">
        <CardTitle className="text-center text-2xl font-bold">Book</CardTitle>
        <CardContent className="flex flex-col lg:flex-row gap-4 p-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className="rounded-md border"
            disabled={(date: Date) =>
              new Date(date).setHours(0, 0, 0, 0) <
              new Date().setHours(0, 0, 0, 0)
            }
          />
          <div className="flex-1">
            <h3 className="text-md font-semibold mb-4 text-center">
              Select Time
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
              {timeSlots.map((slot) => (
                <button
                  key={slot.time}
                  onClick={() => slot.available && setSelectedTime(slot.time)}
                  disabled={!slot.available}
                  className={cn(
                    "py-2 rounded border text-center",
                    selectedTime === slot.time
                      ? "bg-[#E8C5BC] text-white"
                      : slot.available
                        ? "bg-gray-100 hover:bg-gray-200"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  )}
                >
                  {slot.time}
                </button>
              ))}
            </div>
            <Button
              onClick={() => setIsDialogOpen(true)}
              disabled={!selectedDate || !selectedTime || loading}
              className="w-full py-2 bg-[#E8C5BC] text-black hover:bg-[#ddb0a3]"
            >
              continue
            </Button>
          </div>
        </CardContent>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogTitle>Confirm Booking</DialogTitle>
            <div className="py-2">
              <p>
                <strong>Name:</strong> {session?.user?.name || "N/A"}
              </p>
              <p>
                <strong>Date:</strong>{" "}
                {selectedDate ? format(selectedDate, "MMMM d, yyyy") : "N/A"}
              </p>
              <p>
                <strong>Time:</strong> {selectedTime || "N/A"}
              </p>
              <p>
                <strong>Amount:</strong> $
                {therapist.rate?.toFixed(2) || "50.00"}
              </p>
            </div>
            <DialogFooter>
              <Button
                onClick={handleBookSession}
                className="bg-[#E8C5BC] text-black hover:bg-[#ddb0a3]"
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
            background-color: #f9e4e4;
          }
          .rdp-day_selected {
            background-color: #ff0000 !important;
            color: white !important;
          }
        `}</style>
      </Card>
    </div>
  );
};

export default BookingPage;
