// File: components/AppointmentCard.tsx
"use client";

import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Calendar as CalendarIcon,
  Clock,
  MessageSquare,
  DollarSign,
} from "lucide-react";
import { format } from "date-fns";

// Re-using the Appointment interface from the parent page
interface Appointment {
  _id: string;
  specialistName: string;
  clientName?: string;
  startTime: string; // ISO String
  endTime: string; // ISO String
  status: "upcoming" | "completed" | "cancelled" | "disputed";
  rating?: number | null;
  reviewCount?: number | null;
  rate?: number | null;
  disputeStatus: string;
}

interface AppointmentCardProps {
  appointment: Appointment;
  onMessage: () => void;
  isSpecialist: boolean;
  isOwnerSpecialist: boolean;
  onUpdate: () => void; // A callback to refresh parent data
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const AppointmentCard: React.FC<AppointmentCardProps> = ({
  appointment,
  onMessage,
  isOwnerSpecialist,
}) => {
  const {
    specialistName,
    clientName,
    startTime,
    endTime,
    rating,
    reviewCount,
    rate,
    status,
  } = appointment;

  const startDate = new Date(startTime);
  const endDate = new Date(endTime);

  const displayName = isOwnerSpecialist ? clientName : specialistName;

  // Add handlers for Dispute, Rate Adjust, Reschedule here
  // These would open their own dialogs or perform actions
  // For simplicity, they are represented by buttons
  const handleDispute = () => {
    /* Logic to open dispute dialog */
  };
  const handleRateAdjust = () => {
    /* Logic to open rate adjust dialog */
  };
  const handleReschedule = () => {
    /* Logic to open reschedule dialog */
  };

  return (
    <motion.div
      className="p-4 border border-[#F3CFC6] rounded-lg shadow-sm bg-white dark:bg-gray-800"
      variants={cardVariants}
    >
      <div className="flex flex-col space-y-3">
        <h3 className="text-lg font-semibold text-black dark:text-white">
          {displayName}
        </h3>

        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
          <CalendarIcon className="h-4 w-4 text-[#F3CFC6]" />
          <span>{format(startDate, "EEEE, MMMM d, yyyy")}</span>
        </div>

        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
          <Clock className="h-4 w-4 text-[#F3CFC6]" />
          <span>{`${format(startDate, "h:mm a")} - ${format(endDate, "h:mm a")}`}</span>
        </div>

        {!isOwnerSpecialist && (
          <div className="flex items-center space-x-2 text-sm">
            <span className="text-yellow-500">
              {"★".repeat(Math.round(rating || 0))}
            </span>
            <span className="text-gray-500 dark:text-gray-400">
              ({reviewCount} reviews)
            </span>
          </div>
        )}

        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
          <DollarSign className="h-4 w-4 text-green-500" />
          <span>${rate}/session</span>
        </div>

        <div className="text-sm font-medium text-gray-600 dark:text-gray-300">
          <span>Status: </span>
          <span className="capitalize p-1 rounded bg-gray-200 dark:bg-gray-700 text-xs">
            {status}
          </span>
        </div>

        <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="outline"
            className="rounded-full"
            onClick={onMessage}
          >
            <MessageSquare className="mr-2 h-4 w-4" /> Message
          </Button>

          {isOwnerSpecialist && (
            <>
              {status === "completed" &&
                appointment.disputeStatus === "none" && (
                  <Button
                    variant="destructive"
                    className="rounded-full"
                    onClick={handleDispute}
                  >
                    Dispute
                  </Button>
                )}
              <Button
                variant="outline"
                className="rounded-full"
                onClick={handleRateAdjust}
              >
                <DollarSign className="mr-2 h-4 w-4" /> Adjust Rate
              </Button>
              <Button
                variant="outline"
                className="rounded-full"
                onClick={handleReschedule}
              >
                <CalendarIcon className="mr-2 h-4 w-4" /> Reschedule
              </Button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default AppointmentCard;
