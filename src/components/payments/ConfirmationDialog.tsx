// src/components/payments/ConfirmationDialog.tsx

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  CheckCircle2,
  XCircle,
  Star,
  Clock,
  MapPin,
  DollarSign,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { useConfirmation } from "@/hooks/payments";
import { cn } from "@/lib/utils";

interface ConfirmationDialogProps {
  appointmentId: string | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ConfirmationDialog({
  appointmentId,
  open,
  onClose,
  onSuccess,
}: ConfirmationDialogProps) {
  const [step, setStep] = useState<"confirm" | "review" | "success">("confirm");
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [feedback, setFeedback] = useState("");

  const { confirmation, isLoading, error, confirm, isSubmitting, submitError } =
    useConfirmation(appointmentId);

  const handleConfirmOccurred = async () => {
    // Show review step for clients
    if (confirmation && step === "confirm") {
      setStep("review");
    }
  };

  const handleConfirmNotOccurred = async () => {
    await submitConfirmation(false);
  };

  const submitConfirmation = async (occurred: boolean, withReview = false) => {
    try {
      await confirm(
        occurred,
        withReview && rating > 0 ? { rating, feedback } : undefined
      );
      setStep("success");
      setTimeout(() => {
        onSuccess();
        resetDialog();
      }, 2000);
    } catch (err) {
      console.error("Confirmation error:", err);
    }
  };

  const handleSubmitReview = async () => {
    await submitConfirmation(true, true);
  };

  const handleSkipReview = async () => {
    await submitConfirmation(true, false);
  };

  const resetDialog = () => {
    setStep("confirm");
    setRating(0);
    setFeedback("");
  };

  const handleClose = () => {
    resetDialog();
    onClose();
  };

  const formatTime = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount) return "$0";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <AnimatePresence mode="wait">
          {/* Loading State */}
          {isLoading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-12 flex flex-col items-center justify-center"
            >
              <Loader2 className="w-8 h-8 text-[#F3CFC6] animate-spin mb-4" />
              <p className="text-[#C4C4C4]">Loading appointment details...</p>
            </motion.div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-8 text-center"
            >
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 dark:text-red-400">{error}</p>
              <Button onClick={handleClose} className="mt-4" variant="outline">
                Close
              </Button>
            </motion.div>
          )}

          {/* Confirm Step */}
          {!isLoading && !error && step === "confirm" && confirmation && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <DialogHeader>
                <DialogTitle>Confirm Appointment</DialogTitle>
                <DialogDescription>
                  Did this appointment take place?
                </DialogDescription>
              </DialogHeader>

              {/* Appointment Details */}
              <div className="my-6 p-4 bg-[#F3CFC6]/10 dark:bg-[#C4C4C4]/10 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar className="h-12 w-12 border-2 border-[#F3CFC6]">
                    <AvatarImage
                      src={confirmation.client?.profileImage || undefined}
                    />
                    <AvatarFallback className="bg-[#F3CFC6]/20 text-[#F3CFC6]">
                      {confirmation.client?.name?.charAt(0) ||
                        confirmation.professional.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-black dark:text-white">
                      {confirmation.client?.name ||
                        confirmation.professional.name}
                    </p>
                    <p className="text-sm text-[#C4C4C4]">
                      {confirmation.client ? "Client" : "Professional"}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-black dark:text-white">
                    <Clock className="w-4 h-4 text-[#C4C4C4]" />
                    <span>
                      {formatDate(confirmation.appointment.startTime)} at{" "}
                      {formatTime(confirmation.appointment.startTime)}
                    </span>
                  </div>
                  {confirmation.appointment.venue && (
                    <div className="flex items-center gap-2 text-black dark:text-white">
                      <MapPin className="w-4 h-4 text-[#C4C4C4]" />
                      <span>
                        {confirmation.appointment.venue === "host"
                          ? "At their location"
                          : "At your location"}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-black dark:text-white">
                    <DollarSign className="w-4 h-4 text-[#C4C4C4]" />
                    <span>
                      {formatCurrency(
                        confirmation.appointment.adjustedRate ||
                          confirmation.appointment.rate
                      )}
                      /hour
                    </span>
                  </div>
                </div>
              </div>

              {/* Submit Error */}
              {submitError && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {submitError}
                  </p>
                </div>
              )}

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={handleConfirmNotOccurred}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <XCircle className="w-4 h-4 mr-2" />
                  )}
                  Did Not Occur
                </Button>
                <Button
                  onClick={handleConfirmOccurred}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto bg-[#F3CFC6] hover:bg-[#F3CFC6]/80 text-black"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                  )}
                  Yes, It Occurred
                </Button>
              </DialogFooter>
            </motion.div>
          )}

          {/* Review Step */}
          {step === "review" && confirmation && (
            <motion.div
              key="review"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <DialogHeader>
                <DialogTitle>Leave a Review</DialogTitle>
                <DialogDescription>
                  How was your experience with {confirmation.professional.name}?
                </DialogDescription>
              </DialogHeader>

              <div className="my-6 space-y-4">
                {/* Star Rating */}
                <div className="space-y-2">
                  <Label>Rating</Label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoveredRating(star)}
                        onMouseLeave={() => setHoveredRating(0)}
                        className="p-1 transition-transform hover:scale-110"
                      >
                        <Star
                          className={cn(
                            "w-8 h-8 transition-colors",
                            star <= (hoveredRating || rating)
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-[#C4C4C4]"
                          )}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Feedback */}
                <div className="space-y-2">
                  <Label htmlFor="feedback">Feedback (optional)</Label>
                  <Textarea
                    id="feedback"
                    placeholder="Share your experience..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    className="min-h-[100px] resize-none"
                    maxLength={1000}
                  />
                  <p className="text-xs text-[#C4C4C4] text-right">
                    {feedback.length}/1000
                  </p>
                </div>
              </div>

              {submitError && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {submitError}
                  </p>
                </div>
              )}

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button
                  variant="ghost"
                  onClick={handleSkipReview}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  Skip
                </Button>
                <Button
                  onClick={handleSubmitReview}
                  disabled={isSubmitting || rating === 0}
                  className="w-full sm:w-auto bg-[#F3CFC6] hover:bg-[#F3CFC6]/80 text-black"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Star className="w-4 h-4 mr-2" />
                  )}
                  Submit Review
                </Button>
              </DialogFooter>
            </motion.div>
          )}

          {/* Success Step */}
          {step === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="py-12 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
              >
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              </motion.div>
              <h3 className="text-lg font-semibold text-black dark:text-white mb-2">
                Confirmation Submitted!
              </h3>
              <p className="text-[#C4C4C4]">
                Thank you for confirming your appointment.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
