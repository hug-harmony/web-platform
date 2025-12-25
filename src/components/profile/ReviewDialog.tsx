// src/app/dashboard/profile/[id]/ReviewDialog.tsx

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedRating: number;
  setSelectedRating: (rating: number) => void;
  feedback: string;
  setFeedback: (feedback: string) => void;
  submitError: string | null;
  onSubmit: () => Promise<void>;
  renderStars: (
    rating: number,
    interactive?: boolean,
    onSelect?: (val: number) => void
  ) => React.ReactNode;
}

export default function ReviewDialog({
  open,
  onOpenChange,
  selectedRating,
  setSelectedRating,
  feedback,
  setFeedback,
  submitError,
  onSubmit,
  renderStars,
}: ReviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Write Your Review</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Rating</Label>
            <div className="flex">
              {renderStars(selectedRating, true, setSelectedRating)}
            </div>
          </div>
          <div>
            <Label htmlFor="feedback">Feedback</Label>
            <Textarea
              id="feedback"
              placeholder="Write your review here..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
          </div>
          {submitError && <p className="text-red-500 text-sm">{submitError}</p>}
        </div>
        <DialogFooter>
          <Button onClick={onSubmit} disabled={!selectedRating || !feedback}>
            Submit Review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
