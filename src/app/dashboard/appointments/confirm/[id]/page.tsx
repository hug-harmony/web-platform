"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { MessageSquare } from "lucide-react";

// Type definitions
interface BookingDetails {
  name: string;
  specialistName: string;
  date: string;
  time: string;
  paymentMethod: string;
  totalAmount: string;
}

// Animation variants (same as booking page)
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

  const handleAddToCalendar = () => {
    if (!bookingId) {
      toast.error("No booking ID available");
      return;
    }
    // Trigger download of .ics file
    window.location.href = `/api/appointment/${bookingId}/calendar`;
  };

  if (loading) {
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
                Booking Confirmation
              </CardTitle>
            </motion.div>
          </CardHeader>
          <CardContent>
            <motion.div
              variants={itemVariants}
              className="text-center text-xl text-black dark:text-white"
            >
              Loading...
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (!bookingDetails) {
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
                Booking Confirmation
              </CardTitle>
            </motion.div>
          </CardHeader>
          <CardContent>
            <motion.div
              variants={itemVariants}
              className="text-center text-xl text-black dark:text-white"
            >
              Error: Unable to load booking details
            </motion.div>
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
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
        <CardHeader>
          <motion.div variants={itemVariants}>
            <CardTitle className="text-2xl text-black dark:text-white">
              Booking Confirmation
            </CardTitle>
            <p className="text-sm text-[#C4C4C4]">
              Your appointment has been successfully booked
            </p>
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
              <a href="/dashboard">
                <MessageSquare className="mr-2 h-4 w-4 text-[#F3CFC6]" />
                Back to Dashboard
              </a>
            </Button>
          </motion.div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-black dark:text-white">
            Booking Details
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-6">
          <motion.div variants={itemVariants} className="space-y-4">
            <div className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl">
              <p className="text-lg font-medium text-black dark:text-white">
                Name
              </p>
              <p className="text-lg text-gray-500 dark:text-gray-400">
                {bookingDetails.name}
              </p>
            </div>
            <div className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl">
              <p className="text-lg font-medium text-black dark:text-white">
                Professional Name
              </p>
              <p className="text-lg text-gray-500 dark:text-gray-400">
                {bookingDetails.specialistName}
              </p>
            </div>
            <div className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl">
              <p className="text-lg font-medium text-black dark:text-white">
                Date
              </p>
              <p className="text-lg text-gray-500 dark:text-gray-400">
                {bookingDetails.date}
              </p>
            </div>
            <div className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl">
              <p className="text-lg font-medium text-black dark:text-white">
                Time
              </p>
              <p className="text-lg text-gray-500 dark:text-gray-400">
                {bookingDetails.time}
              </p>
            </div>
            <div className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl">
              <p className="text-lg font-medium text-black dark:text-white">
                Payment Method
              </p>
              <p className="text-lg text-gray-500 dark:text-gray-400">
                {bookingDetails.paymentMethod}
              </p>
            </div>
            <div className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl">
              <p className="text-lg font-medium text-black dark:text-white">
                Total Amount
              </p>
              <p className="text-lg text-gray-500 dark:text-gray-400">
                {bookingDetails.totalAmount}
              </p>
            </div>
          </motion.div>
          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row justify-end gap-2"
          >
            <Button
              onClick={handleAddToCalendar}
              variant="outline"
              className="text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20 rounded-full"
            >
              Add to Calendar
            </Button>
            <Button
              onClick={handleBackToAppointments}
              className="py-4 px-6 text-lg bg-[#F3CFC6] hover:bg-[#C4C4C4] text-black dark:text-white rounded-full"
            >
              View All Appointments
            </Button>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default BookingConfirmationPage;
