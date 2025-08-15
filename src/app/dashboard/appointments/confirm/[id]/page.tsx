"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

// Type definitions
interface BookingDetails {
  name: string;
  specialistName: string;
  date: string;
  time: string;
  paymentMethod: string;
  totalAmount: string;
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
    return <div className="p-4 text-center text-xl">Loading...</div>;
  }

  if (!bookingDetails) {
    return (
      <div className="p-4 text-center text-xl">
        Error: Unable to load booking details
      </div>
    );
  }

  return (
    <motion.div
      className="p-4 space-y-6 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Card className="rounded-xl border border-gray-200">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-[#333] flex items-center">
            Booking Details
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-6">
          <motion.div variants={itemVariants} className="space-y-4">
            <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-xl">
              <p className="text-lg font-medium">Name</p>
              <p className="text-lg text-gray-500">{bookingDetails.name}</p>
            </div>
            <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-xl">
              <p className="text-lg font-medium">Professional Name</p>
              <p className="text-lg text-gray-500">
                {bookingDetails.specialistName}
              </p>
            </div>
            <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-xl">
              <p className="text-lg font-medium">Date</p>
              <p className="text-lg text-gray-500">{bookingDetails.date}</p>
            </div>
            <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-xl">
              <p className="text-lg font-medium">Time</p>
              <p className="text-lg text-gray-500">{bookingDetails.time}</p>
            </div>
            <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-xl">
              <p className="text-lg font-medium">Payment Method</p>
              <p className="text-lg text-gray-500">
                {bookingDetails.paymentMethod}
              </p>
            </div>
            <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-xl">
              <p className="text-lg font-medium">Total Amount</p>
              <p className="text-lg text-gray-500">
                {bookingDetails.totalAmount}
              </p>
            </div>
          </motion.div>
          <motion.div variants={itemVariants} className="flex justify-end">
            <Button
              onClick={handleBackToAppointments}
              className="py-4 px-6 text-lg rounded-xl font-bold bg-[#E8C5BC] text-black hover:bg-[#DDB0A3]"
            >
              View all appointments
            </Button>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default BookingConfirmationPage;
