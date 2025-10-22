// File: components/AppointmentCard.tsx
"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Calendar as CalendarIcon,
  Clock,
  MessageSquare,
  DollarSign,
  AlertTriangle,
} from "lucide-react";
import {
  Dialog,
  DialogClose,
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
import { format, parseISO } from "date-fns";

// This interface matches the data structure from your updated API routes
interface Appointment {
  _id: string;
  specialistName: string;
  clientName?: string;
  startTime: string; // Full ISO String (e.g., "2024-10-27T10:00:00.000Z")
  endTime: string; // Full ISO String
  status: "upcoming" | "completed" | "cancelled" | "disputed";
  rating?: number | null;
  reviewCount?: number | null;
  rate?: number | null;
  disputeStatus: string;
}

interface AppointmentCardProps {
  appointment: Appointment;
  onMessage: () => void;
  isOwnerSpecialist: boolean;
  onUpdate: () => void; // Callback to refresh data on the parent page
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const AppointmentCard: React.FC<AppointmentCardProps> = ({
  appointment,
  onMessage,
  isOwnerSpecialist,
  onUpdate,
}) => {
  const {
    _id,
    clientName,
    specialistName,
    startTime,
    endTime,
    rate,
    status,
    disputeStatus,
    rating,
    reviewCount,
  } = appointment;

  // --- State for Modals ---
  // Dispute State
  const [disputeReason, setDisputeReason] = useState("");
  const [submittingDispute, setSubmittingDispute] = useState(false);

  // Adjust Rate State
  const [adjustRate, setAdjustRate] = useState<string>(rate?.toString() || "0");
  const [adjustRateNote, setAdjustRateNote] = useState("");
  const [submittingRate, setSubmittingRate] = useState(false);

  // Reschedule State
  const [newDate, setNewDate] = useState("");
  const [newStartTime, setNewStartTime] = useState("");
  const [newEndTime, setNewEndTime] = useState("");
  const [rescheduleNote, setRescheduleNote] = useState("");
  const [submittingReschedule, setSubmittingReschedule] = useState(false);

  // Pre-fill forms when the appointment data is available
  useEffect(() => {
    if (startTime) {
      const startDate = parseISO(startTime);
      setNewDate(format(startDate, "yyyy-MM-dd"));
      setNewStartTime(format(startDate, "HH:mm"));
    }
    if (endTime) {
      const endDate = parseISO(endTime);
      setNewEndTime(format(endDate, "HH:mm"));
    }
    if (rate) {
      setAdjustRate(rate.toString());
    }
  }, [startTime, endTime, rate]);

  // --- Handler Functions ---
  const handleDispute = async () => {
    if (!disputeReason || disputeReason.length < 10) {
      toast.error("Please provide a detailed reason (minimum 10 characters).");
      return;
    }
    setSubmittingDispute(true);
    try {
      const res = await fetch(`/api/appointment/${_id}/dispute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: disputeReason }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to submit dispute.");
      }
      toast.success("Dispute submitted successfully.");
      onUpdate(); // Refresh parent data
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSubmittingDispute(false);
    }
  };

  const handleRateAdjust = async () => {
    const rateValue = parseFloat(adjustRate);
    if (isNaN(rateValue) || rateValue < 0) {
      toast.error("Please enter a valid, non-negative rate.");
      return;
    }
    setSubmittingRate(true);
    try {
      const res = await fetch(`/api/appointment/${_id}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adjustedRate: rateValue,
          note: adjustRateNote,
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to adjust rate.");
      }
      toast.success("Rate adjusted successfully.");
      onUpdate();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSubmittingRate(false);
    }
  };

  const handleReschedule = async () => {
    if (!newDate || !newStartTime || !newEndTime) {
      toast.error("Please fill out the new date, start time, and end time.");
      return;
    }
    setSubmittingReschedule(true);
    try {
      const startDateTimeISO = new Date(
        `${newDate}T${newStartTime}`
      ).toISOString();
      const endDateTimeISO = new Date(`${newDate}T${newEndTime}`).toISOString();

      if (new Date(startDateTimeISO) >= new Date(endDateTimeISO)) {
        toast.error("End time must be after the start time.");
        setSubmittingReschedule(false);
        return;
      }

      const res = await fetch(`/api/appointment/${_id}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startTime: startDateTimeISO,
          endTime: endDateTimeISO,
          note: rescheduleNote,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to reschedule.");
      }

      toast.success("Appointment rescheduled successfully.");
      onUpdate();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSubmittingReschedule(false);
    }
  };

  const displayName = isOwnerSpecialist ? clientName : specialistName;
  const startDate = parseISO(startTime);
  const endDate = parseISO(endTime);

  return (
    <motion.div className="p-4 space-y-3" variants={cardVariants}>
      <h3 className="text-xl font-semibold text-black dark:text-white">
        {displayName}
      </h3>
      <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
        <CalendarIcon className="h-4 w-4 text-[#F3CFC6]" />
        <span>{format(startDate, "EEEE, MMMM d, yyyy")}</span>
      </div>
      <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
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
      <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
        <DollarSign className="h-4 w-4 text-green-500" />
        <span>${rate}/session</span>
      </div>
      <div className="text-sm font-medium text-gray-600 dark:text-gray-300">
        <span>Status: </span>
        <span className="capitalize p-1 px-2 rounded-full bg-gray-100 dark:bg-gray-700 text-xs">
          {status}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button variant="outline" className="rounded-full" onClick={onMessage}>
          <MessageSquare className="mr-2 h-4 w-4" /> Message
        </Button>

        {isOwnerSpecialist && (
          <>
            {/* --- Dispute Modal --- */}
            {status === "completed" && disputeStatus === "none" && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="destructive" className="rounded-full">
                    <AlertTriangle className="mr-2 h-4 w-4" /> Dispute
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Dispute Appointment</DialogTitle>
                    <DialogDescription>
                      Provide a reason for disputing this appointment. This
                      action is final.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <Label htmlFor="dispute-reason">Dispute Reason</Label>
                    <Textarea
                      id="dispute-reason"
                      value={disputeReason}
                      onChange={(e) => setDisputeReason(e.target.value)}
                      placeholder="Please describe the issue in detail..."
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={handleDispute}
                      disabled={submittingDispute || disputeReason.length < 10}
                    >
                      {submittingDispute ? "Submitting..." : "Submit Dispute"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {/* --- Adjust Rate Modal --- */}
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
                    Enter a new rate for this specific appointment. This will be
                    recorded.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="adjust-rate">New Rate ($)</Label>
                    <Input
                      id="adjust-rate"
                      type="number"
                      value={adjustRate}
                      onChange={(e) => setAdjustRate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="adjust-rate-note">Note (Optional)</Label>
                    <Textarea
                      id="adjust-rate-note"
                      value={adjustRateNote}
                      onChange={(e) => setAdjustRateNote(e.target.value)}
                      placeholder="Reason for rate adjustment..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={handleRateAdjust}
                    disabled={submittingRate || parseFloat(adjustRate) < 0}
                  >
                    {submittingRate ? "Saving..." : "Save New Rate"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* --- Reschedule Modal --- */}
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
                    Select a new date and time for the session.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="reschedule-date">New Date</Label>
                    <Input
                      id="reschedule-date"
                      type="date"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="reschedule-start-time">Start Time</Label>
                      <Input
                        id="reschedule-start-time"
                        type="time"
                        value={newStartTime}
                        onChange={(e) => setNewStartTime(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="reschedule-end-time">End Time</Label>
                      <Input
                        id="reschedule-end-time"
                        type="time"
                        value={newEndTime}
                        onChange={(e) => setNewEndTime(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="reschedule-note">Note (Optional)</Label>
                    <Textarea
                      id="reschedule-note"
                      value={rescheduleNote}
                      onChange={(e) => setRescheduleNote(e.target.value)}
                      placeholder="Reason for rescheduling..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={handleReschedule}
                    disabled={submittingReschedule}
                  >
                    {submittingReschedule ? "Saving..." : "Confirm Reschedule"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    </motion.div>
  );
};

export default AppointmentCard;
