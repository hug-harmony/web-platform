// src/app/dashboard/profile/[id]/ViewAllReviewsDialog.tsx

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ProfileReview } from "@/types/profile";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.15 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

function ReviewCard({
  review,
  renderStars,
}: {
  review: ProfileReview;
  renderStars: (rating: number) => React.ReactNode;
}) {
  return (
    <motion.div
      variants={cardVariants}
      className="border-b pb-4 last:border-b-0"
    >
      <div className="flex items-start space-x-4">
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-black dark:text-white">
              {review.reviewerName}
            </p>
            <div className="flex">{renderStars(review.rating)}</div>
          </div>
          <p className="text-sm text-[#C4C4C4] mt-1">
            {new Date(review.createdAt).toLocaleDateString()}
          </p>
          <p className="text-sm sm:text-base text-black dark:text-white mt-2">
            {review.feedback}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

interface ViewAllReviewsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reviews: ProfileReview[];
  renderStars: (
    rating: number,
    interactive?: boolean,
    onSelect?: (val: number) => void
  ) => React.ReactNode;
}

export default function ViewAllReviewsDialog({
  open,
  onOpenChange,
  reviews,
  renderStars,
}: ViewAllReviewsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>All Reviews</DialogTitle>
        </DialogHeader>
        <motion.div className="space-y-4" variants={containerVariants}>
          <AnimatePresence>
            {reviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                renderStars={renderStars}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
