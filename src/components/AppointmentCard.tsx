// components/AppointmentCard.tsx
import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MessageSquare } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface AppointmentCardProps {
  specialistName: string;
  date: string;
  time: string;
  rating: number;
  reviewCount: number;
  rate: number;
  status: "upcoming" | "completed" | "cancelled" | "disputed";
  onMessage: () => void;
  appointmentId: string;
  isSpecialist: boolean;
  disputeStatus: string;
  onDispute?: () => void;
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const AppointmentCard: React.FC<AppointmentCardProps> = ({
  specialistName,
  date,
  time,
  rating,
  reviewCount,
  rate,
  status,
  onMessage,
  appointmentId,
  isSpecialist,
  disputeStatus,
  onDispute,
}) => {
  const [disputeReason, setDisputeReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleDispute = async () => {
    if (!disputeReason || disputeReason.length < 10) {
      toast.error("Please provide a reason (minimum 10 characters).");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/dispute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: disputeReason }),
        credentials: "include",
      });

      if (res.ok) {
        toast.success("Dispute submitted successfully.");
        setDisputeReason("");
        if (onDispute) onDispute();
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || "Failed to submit dispute");
      }
    } catch (error) {
      console.error("Dispute submission error:", error);
      toast.error("Failed to submit dispute");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      className="p-4 border border-[#F3CFC6] rounded-lg shadow-sm bg-white dark:bg-gray-800 hover:bg-[#F3CFC6]/10 dark:hover:bg-[#C4C4C4]/10 transition-all"
      variants={cardVariants}
    >
      <div className="flex flex-col space-y-2">
        <h3 className="text-lg font-semibold text-black dark:text-white">
          {specialistName}
        </h3>
        <div className="flex items-center space-x-2 text-sm text-[#C4C4C4]">
          <Calendar className="h-4 w-4 text-[#F3CFC6]" />
          <span>{date}</span>
        </div>
        <div className="flex items-center space-x-2 text-sm text-[#C4C4C4]">
          <Clock className="h-4 w-4 text-[#F3CFC6]" />
          <span>{time}</span>
        </div>
        <div className="flex items-center space-x-2 text-sm">
          <span className="text-yellow-500">
            {"★".repeat(Math.round(rating))}
          </span>
          <span className="text-[#C4C4C4]">({reviewCount} reviews)</span>
        </div>
        <div className="text-sm text-[#C4C4C4]">
          <span>${rate}/session</span>
        </div>
        <div className="text-sm text-[#C4C4C4]">
          <span>
            Status: {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        </div>
        <div className="flex space-x-2 mt-2">
          <Button
            variant="outline"
            className="text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20 rounded-full"
            onClick={onMessage}
          >
            <MessageSquare className="mr-2 h-4 w-4 text-[#F3CFC6]" />
            Message
          </Button>
          {isSpecialist &&
            status === "completed" &&
            disputeStatus === "none" && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="bg-red-500 hover:bg-red-600 rounded-full"
                  >
                    Dispute
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-white dark:bg-black">
                  <DialogHeader>
                    <DialogTitle>Dispute Appointment</DialogTitle>
                    <DialogDescription>
                      <div className="space-y-2 text-black dark:text-white">
                        <p>
                          <strong>Appointment:</strong> {specialistName} -{" "}
                          {date} {time}
                        </p>
                        <p>
                          Please provide a reason for disputing this
                          appointment.
                        </p>
                      </div>
                      <div className="space-y-2 mt-4">
                        <Label
                          htmlFor="disputeReason"
                          className="text-black dark:text-white"
                        >
                          Dispute Reason
                        </Label>
                        <Textarea
                          id="disputeReason"
                          value={disputeReason}
                          onChange={(e) => setDisputeReason(e.target.value)}
                          placeholder="Enter reason (e.g., client did not show up)"
                          className="border-[#C4C4C4] focus:ring-[#F3CFC6] dark:bg-black dark:text-white"
                        />
                      </div>
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button
                      variant="destructive"
                      onClick={handleDispute}
                      disabled={submitting || disputeReason.length < 10}
                      className="bg-red-500 hover:bg-red-600"
                    >
                      Submit Dispute
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
        </div>
      </div>
    </motion.div>
  );
};

export default AppointmentCard;
