// src/app/booking-confirmation/page.tsx
"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

const BookingConfirmationPage: React.FC = () => {
  const router = useRouter();

  // Dummy data for booking details
  const bookingDetails = {
    name: "John Doe",
    specialistName: "Dr. Jane Smith",
    date: "October 15, 2025",
    time: "10:00 AM",
    paymentMethod: "Credit Card (**** 1234)",
    totalAmount: "$50.00",
  };

  const handleBackToAppointments = () => {
    router.push("/dashboard/appointments");
  };

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
