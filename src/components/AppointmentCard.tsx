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

interface Appointment {
  _id: string;
  professionalName?: string;
  clientName?: string;
  professionalId: string;
  professionalUserId?: string;
  clientId?: string;
  startTime: string;
  endTime: string;
  status: "upcoming" | "completed" | "cancelled" | "disputed";
  rating?: number | null;
  reviewCount?: number | null;
  rate?: number | null;
  disputeStatus: string;
}

interface AppointmentCardProps {
  appointment: Appointment;
  isProfessional: boolean;
  isOwnerProfessional: boolean;
  onMessage: () => void;
  onUpdate: () => void;
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const AppointmentCard: React.FC<AppointmentCardProps> = ({
  appointment,
  isProfessional,
  isOwnerProfessional,
  onMessage,
  onUpdate,
}) => {
  const {
    _id,
    clientName,
    professionalName,
    startTime,
    endTime,
    rate,
    status,
    disputeStatus,
    rating,
    reviewCount,
  } = appointment;

  const [disputeReason, setDisputeReason] = useState("");
  const [submittingDispute, setSubmittingDispute] = useState(false);
  const [adjustRate, setAdjustRate] = useState<string>(rate?.toString() || "0");
  const [adjustRateNote, setAdjustRateNote] = useState("");
  const [submittingRate, setSubmittingRate] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newStartTime, setNewStartTime] = useState("");
  const [newEndTime, setNewEndTime] = useState("");
  const [rescheduleNote, setRescheduleNote] = useState("");
  const [submittingReschedule, setSubmittingReschedule] = useState(false);

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

  const handleDispute = async () => {
    if (!disputeReason || disputeReason.length < 10) {
      toast.error("Please provide a detailed reason (min 10 chars).");
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
        const err = await res.json();
        throw new Error(err.error || "Failed to submit dispute");
      }
      toast.success("Dispute submitted");
      onUpdate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmittingDispute(false);
    }
  };

  const handleRateAdjust = async () => {
    const rateValue = parseFloat(adjustRate);
    if (isNaN(rateValue) || rateValue < 0) {
      toast.error("Enter a valid rate");
      return;
    }
    setSubmittingRate(true);
    try {
      const res = await fetch(`/api/appointment/${_id}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adjustedRate: rateValue, note: adjustRateNote }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to adjust rate");
      }
      toast.success("Rate updated");
      onUpdate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmittingRate(false);
    }
  };

  const handleReschedule = async () => {
    if (!newDate || !newStartTime || !newEndTime) {
      toast.error("Fill all time fields");
      return;
    }
    setSubmittingReschedule(true);
    try {
      const start = new Date(`${newDate}T${newStartTime}`).toISOString();
      const end = new Date(`${newDate}T${newEndTime}`).toISOString();
      if (new Date(start) >= new Date(end)) {
        toast.error("End time must be after start");
        return;
      }

      const res = await fetch(`/api/appointment/${_id}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startTime: start,
          endTime: end,
          note: rescheduleNote,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to reschedule");
      }
      toast.success("Rescheduled");
      onUpdate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmittingReschedule(false);
    }
  };

  const isMobile = () => /Mobi|Android/i.test(navigator.userAgent);

  const generateCalendarLinks = () => {
    const start = new Date(appointment.startTime);
    const end = new Date(appointment.endTime);
    const title = encodeURIComponent(`${displayName} – Appointment`);
    const description = encodeURIComponent(
      `Appointment with ${displayName}. Rate: $${rate || 50}`
    );
    const location = encodeURIComponent("Virtual / In-person (check details)");

    const formatDateForWeb = (date: Date) =>
      date.toISOString().replace(/-|:|\.\d+/g, "");

    const startStr = formatDateForWeb(start);
    const endStr = formatDateForWeb(end);

    return {
      google: `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startStr}/${endStr}&details=${description}&location=${location}&sf=true&output=xml`,
      outlook: `https://outlook.live.com/owa/?path=/calendar/action/compose&subject=${title}&startdt=${start.toISOString()}&enddt=${end.toISOString()}&body=${description}&location=${location}`,
      yahoo: `https://calendar.yahoo.com/?v=60&view=d&type=20&title=${title}&st=${startStr}&et=${endStr}&desc=${description}&in_loc=${location}`,
    };
  };

  const handleAddToCalendar = async () => {
    if (isMobile()) {
      // Mobile → download ICS
      try {
        const res = await fetch(`/api/appointment/${appointment._id}/calendar`);
        if (!res.ok) throw new Error("Failed to fetch calendar event");

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `appointment-${appointment._id}.ics`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error(error);
        toast.error("Could not download calendar event. Please try again.");
      }
    } else {
      // Desktop → open Google/Outlook/Yahoo links
      const links = generateCalendarLinks();
      // You can choose which calendar to open, e.g., Google Calendar:
      window.open(links.google, "_blank");
    }
  };

  const displayName = isOwnerProfessional ? clientName : professionalName;
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
      {!isOwnerProfessional && (
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

        <Button
          variant="outline"
          className="rounded-full"
          onClick={handleAddToCalendar}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          Add to Calendar
        </Button>

        {isProfessional && isOwnerProfessional && (
          <>
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
                      Provide a reason. This action is final.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <Label htmlFor="dispute-reason">Reason</Label>
                    <Textarea
                      id="dispute-reason"
                      value={disputeReason}
                      onChange={(e) => setDisputeReason(e.target.value)}
                      placeholder="Describe the issue..."
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={handleDispute}
                      disabled={submittingDispute || disputeReason.length < 10}
                    >
                      {submittingDispute ? "Submitting..." : "Submit"}
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
                      placeholder="Reason..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleRateAdjust} disabled={submittingRate}>
                    {submittingRate ? "Saving..." : "Save"}
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
                  <DialogTitle>Reschedule</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="reschedule-date">Date</Label>
                    <Input
                      id="reschedule-date"
                      type="date"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="reschedule-start-time">Start</Label>
                      <Input
                        id="reschedule-start-time"
                        type="time"
                        value={newStartTime}
                        onChange={(e) => setNewStartTime(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="reschedule-end-time">End</Label>
                      <Input
                        id="reschedule-end-time"
                        type="time"
                        value={newEndTime}
                        onChange={(e) => setNewEndTime(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="reschedule-note">Note</Label>
                    <Textarea
                      id="reschedule-note"
                      value={rescheduleNote}
                      onChange={(e) => setRescheduleNote(e.target.value)}
                      placeholder="Reason..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={handleReschedule}
                    disabled={submittingReschedule}
                  >
                    {submittingReschedule ? "Saving..." : "Confirm"}
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
