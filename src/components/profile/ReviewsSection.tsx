// src/app/dashboard/profile/[id]/ReviewsSection.tsx

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ProfileReview } from "@/types/profile";

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.15 } },
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

interface ReviewsSectionProps {
  reviews: ProfileReview[];
  setIsReviewDialogOpen: (open: boolean) => void;
  setIsViewAllReviewsOpen: (open: boolean) => void;
  renderStars: (
    rating: number,
    interactive?: boolean,
    onSelect?: (val: number) => void
  ) => React.ReactNode;
}

export default function ReviewsSection({
  reviews,
  setIsReviewDialogOpen,
  setIsViewAllReviewsOpen,
  renderStars,
}: ReviewsSectionProps) {
  return (
    <motion.div variants={itemVariants}>
      <Card className="shadow-lg">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
            <h3 className="text-xl font-bold text-black dark:text-white">
              Reviews
            </h3>
            <Button
              onClick={() => setIsReviewDialogOpen(true)}
              className="bg-[#F3CFC6] hover:bg-[#C4C4C4] text-black dark:text-white px-4 py-2 rounded-full w-full sm:w-auto"
            >
              Write a Review
            </Button>
          </div>

          {reviews.length > 0 ? (
            <>
              <motion.div className="space-y-4" variants={containerVariants}>
                <AnimatePresence>
                  {reviews.slice(0, 3).map((review) => (
                    <ReviewCard
                      key={review.id}
                      review={review}
                      renderStars={renderStars}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>

              {reviews.length > 3 && (
                <Button
                  variant="link"
                  className="text-[#F3CFC6] hover:text-[#C4C4C4] mt-4"
                  onClick={() => setIsViewAllReviewsOpen(true)}
                >
                  View All Reviews
                </Button>
              )}
            </>
          ) : (
            <p className="text-center text-[#C4C4C4]">No reviews yet.</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
