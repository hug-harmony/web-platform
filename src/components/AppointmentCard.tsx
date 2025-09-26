"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Calendar as CalendarIcon,
  Clock,
  MessageSquare,
  DollarSign,
} from "lucide-react";
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
import { Input } from "@/components/ui/input";

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
  isOwnerSpecialist: boolean;
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

  isOwnerSpecialist,
  disputeStatus,
  onDispute,
}) => {
  const [disputeReason, setDisputeReason] = useState("");
  const [submittingDispute, setSubmittingDispute] = useState(false);

  const [adjustRate, setAdjustRate] = useState<string>("");
  const [adjustRateNote, setAdjustRateNote] = useState<string>("");
  const [submittingRate, setSubmittingRate] = useState(false);

  const [rescheduleDate, setRescheduleDate] = useState<string>("");
  const [rescheduleTime, setRescheduleTime] = useState<string>("");
  const [rescheduleNote, setRescheduleNote] = useState<string>("");
  const [submittingReschedule, setSubmittingReschedule] = useState(false);

  const handleDispute = async () => {
    if (!disputeReason || disputeReason.length < 10) {
      toast.error("Please provide a reason (minimum 10 characters).");
      return;
    }
    setSubmittingDispute(true);
    try {
      const res = await fetch(`/api/appointment/${appointmentId}/dispute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: disputeReason }),
        credentials: "include",
      });

      if (res.ok) {
        toast.success("Dispute submitted successfully.");
        setDisputeReason("");
        onDispute?.();
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || "Failed to submit dispute");
      }
    } catch (error) {
      console.error("Dispute error:", error);
      toast.error("Failed to submit dispute");
    } finally {
      setSubmittingDispute(false);
    }
  };

  const handleRateAdjust = async () => {
    if (!adjustRate || parseFloat(adjustRate) <= 0) {
      toast.error("Please provide a valid rate.");
      return;
    }
    setSubmittingRate(true);
    try {
      const res = await fetch(`/api/appointment/${appointmentId}/rate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adjustedRate: parseFloat(adjustRate),
          note: adjustRateNote,
        }),
        credentials: "include",
      });
      if (res.ok) {
        toast.success("Rate adjusted successfully.");
        setAdjustRate("");
        setAdjustRateNote("");
        onDispute?.();
      } else {
        const err = await res.json();
        toast.error(err.error);
      }
    } catch (error) {
      console.error("Rate adjust error:", error);
      toast.error("Failed to adjust rate");
    } finally {
      setSubmittingRate(false);
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleDate || !rescheduleTime) {
      toast.error("Please select both date and time.");
      return;
    }
    setSubmittingReschedule(true);
    try {
      const res = await fetch(`/api/appointment/${appointmentId}/reschedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: rescheduleDate,
          time: rescheduleTime,
          note: rescheduleNote,
        }),
        credentials: "include",
      });
      if (res.ok) {
        toast.success("Appointment rescheduled successfully.");
        setRescheduleDate("");
        setRescheduleTime("");
        setRescheduleNote("");
        onDispute?.();
      } else {
        const err = await res.json();
        toast.error(err.error);
      }
    } catch (error) {
      console.error("Reschedule error:", error);
      toast.error("Failed to reschedule");
    } finally {
      setSubmittingReschedule(false);
    }
  };

  return (
    <motion.div
      className="p-4 border border-[#F3CFC6] rounded-lg shadow-sm bg-white dark:bg-gray-800"
      variants={cardVariants}
    >
      <div className="flex flex-col space-y-2">
        <h3 className="text-lg font-semibold text-black dark:text-white">
          {specialistName}
        </h3>
        <div className="flex items-center space-x-2 text-sm text-[#C4C4C4]">
          <CalendarIcon className="h-4 w-4 text-[#F3CFC6]" />
          <span>{date}</span>
        </div>
        <div className="flex items-center space-x-2 text-sm text-[#C4C4C4]">
          <Clock className="h-4 w-4 text-[#F3CFC6]" />
          <span>{time}</span>
        </div>
        {!isOwnerSpecialist && (
          <div className="flex items-center space-x-2 text-sm">
            <span className="text-yellow-500">
              {"★".repeat(Math.round(rating))}
            </span>
            <span className="text-[#C4C4C4]">({reviewCount} reviews)</span>
          </div>
        )}
        <div className="text-sm text-[#C4C4C4]">
          <span>${rate}/session</span>
        </div>
        <div className="text-sm text-[#C4C4C4]">
          <span>Status: {status}</span>
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          <Button
            variant="outline"
            className="rounded-full"
            onClick={onMessage}
          >
            <MessageSquare className="mr-2 h-4 w-4" /> Message
          </Button>

          {isOwnerSpecialist && (
            <>
              {status === "completed" && disputeStatus === "none" && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="destructive" className="rounded-full">
                      Dispute
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Dispute Appointment</DialogTitle>
                      <DialogDescription>
                        Provide a reason for disputing this appointment.
                      </DialogDescription>
                    </DialogHeader>
                    <div>
                      <Label htmlFor="disputeReason">Dispute Reason</Label>
                      <Textarea
                        id="disputeReason"
                        value={disputeReason}
                        onChange={(e) => setDisputeReason(e.target.value)}
                        aria-describedby="disputeReasonDesc"
                      />
                      <span
                        id="disputeReasonDesc"
                        className="text-sm text-gray-500"
                      >
                        Minimum 10 characters.
                      </span>
                    </div>
                    <DialogFooter>
                      <Button
                        onClick={handleDispute}
                        disabled={
                          submittingDispute || disputeReason.length < 10
                        }
                      >
                        {submittingDispute ? (
                          <span className="flex items-center">
                            <svg
                              className="animate-spin h-5 w-5 mr-2"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                                fill="none"
                              />
                            </svg>
                            Submitting...
                          </span>
                        ) : (
                          "Submit Dispute"
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="rounded-full">
                    <DollarSign className="mr-2 h-4 w-4" /> Adjust Rate
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adjust Rate</DialogTitle>
                    <DialogDescription>
                      Enter the new rate and an optional note.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="adjustRate">New Rate ($)</Label>
                      <Input
                        id="adjustRate"
                        type="number"
                        value={adjustRate}
                        onChange={(e) => setAdjustRate(e.target.value)}
                        aria-describedby="adjustRateDesc"
                      />
                      <span
                        id="adjustRateDesc"
                        className="text-sm text-gray-500"
                      >
                        Enter a positive number.
                      </span>
                    </div>
                    <div>
                      <Label htmlFor="adjustRateNote">Note (Optional)</Label>
                      <Textarea
                        id="adjustRateNote"
                        value={adjustRateNote}
                        onChange={(e) => setAdjustRateNote(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={handleRateAdjust}
                      disabled={
                        submittingRate ||
                        !adjustRate ||
                        parseFloat(adjustRate) <= 0
                      }
                    >
                      {submittingRate ? (
                        <span className="flex items-center">
                          <svg
                            className="animate-spin h-5 w-5 mr-2"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                              fill="none"
                            />
                          </svg>
                          Saving...
                        </span>
                      ) : (
                        "Save"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="rounded-full">
                    <CalendarIcon className="mr-2 h-4 w-4" /> Reschedule
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Reschedule Appointment</DialogTitle>
                    <DialogDescription>
                      Select a new date and time for the appointment.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="rescheduleDate">New Date</Label>
                      <Input
                        id="rescheduleDate"
                        type="date"
                        value={rescheduleDate}
                        onChange={(e) => setRescheduleDate(e.target.value)}
                        aria-describedby="rescheduleDateDesc"
                      />
                      <span
                        id="rescheduleDateDesc"
                        className="text-sm text-gray-500"
                      >
                        Choose a future date.
                      </span>
                    </div>
                    <div>
                      <Label htmlFor="rescheduleTime">New Time</Label>
                      <Input
                        id="rescheduleTime"
                        type="time"
                        value={rescheduleTime}
                        onChange={(e) => setRescheduleTime(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="rescheduleNote">Note (Optional)</Label>
                      <Textarea
                        id="rescheduleNote"
                        value={rescheduleNote}
                        onChange={(e) => setRescheduleNote(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={handleReschedule}
                      disabled={
                        submittingReschedule ||
                        !rescheduleDate ||
                        !rescheduleTime
                      }
                    >
                      {submittingReschedule ? (
                        <span className="flex items-center">
                          <svg
                            className="animate-spin h-5 w-5 mr-2"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                              fill="none"
                            />
                          </svg>
                          Saving...
                        </span>
                      ) : (
                        "Save"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default AppointmentCard;
