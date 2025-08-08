"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

interface BookingDetails {
  name: string;
  specialistName: string;
  date: string;
  time: string;
  paymentMethod: string;
  totalAmount: string;
}

const BookingConfirmationPage: React.FC = () => {
  const router = useRouter();
  const { id: bookingId } = useParams();
  const { data: session } = useSession();
  const [bookingDetails, setBookingDetails] = useState<BookingDetails | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookingDetails = async () => {
      if (!bookingId) {
        toast.error("No booking ID provided");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/appointment/${bookingId}`, {
          cache: "no-store",
          credentials: "include",
        });

        if (!response.ok) {
          if (response.status === 401) {
            router.push("/login");
            return;
          }
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch booking details");
        }

        const bookingData = await response.json();
        console.log("Booking data:", bookingData); // Debug log

        setBookingDetails({
          name: bookingData.userName || session?.user?.name || "N/A",
          specialistName: bookingData.therapistName || "Unknown Specialist",
          date: new Date(bookingData.date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
          time: bookingData.time || "N/A",
          paymentMethod: "Credit Card (**** 1234)", // Dummy payment method
          totalAmount: `$${parseFloat(bookingData.amount || "50").toFixed(2)}`,
        });
      } catch (error) {
        console.error("Fetch error:", error);
        toast.error("Failed to load booking details");
      } finally {
        setLoading(false);
      }
    };

    fetchBookingDetails();
  }, [bookingId, session, router]);

  const handleBackToAppointments = () => {
    router.push("/dashboard/appointments");
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!bookingDetails) {
    return <div>Error: Unable to load booking details</div>;
  }

  return (
    <div className="h-screen w-full flex items-center justify-center">
      <Card className="w-full max-w-4xl h-[500px] rounded-3xl p-4 border border-gray-200 flex flex-col">
        <CardHeader>
          <CardTitle className="text-center text-4xl font-extrabold text-[#333] mt-6">
            Booking Details
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-8 flex-1 flex flex-col justify-between">
          <div className="space-y-6">
            <p className="text-xl font-medium">
              <strong>Name:</strong> {bookingDetails.name}
            </p>
            <p className="text-xl font-medium">
              <strong>Specialist Name:</strong> {bookingDetails.specialistName}
            </p>
            <p className="text-xl font-medium">
              <strong>Date:</strong> {bookingDetails.date}
            </p>
            <p className="text-xl font-medium">
              <strong>Time:</strong> {bookingDetails.time}
            </p>
            <p className="text-xl font-medium">
              <strong>Payment Method:</strong> {bookingDetails.paymentMethod}
            </p>
            <p className="text-xl font-medium">
              <strong>Total Amount:</strong> {bookingDetails.totalAmount}
            </p>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={handleBackToAppointments}
              className="py-5 px-8 text-2xl rounded-xl font-bold bg-[#E8C5BC] text-black hover:bg-[#ddb0a3]"
            >
              View all appointments
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BookingConfirmationPage;
