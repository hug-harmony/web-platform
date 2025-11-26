// components/professionals/ProfessionalsGrid.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ProfessionalCard from "@/components/professionals/ProfessionalCard";
import { EmptyState } from "@/components/professionals/EmptyState";
import Link from "next/link";
import { Therapist } from "@/types/therapist";

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

interface Props {
  loading: boolean;
  professionals: Therapist[];
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

export function ProfessionalsGrid({
  loading,
  professionals,
  hasActiveFilters,
  onClearFilters,
}: Props) {
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            Available Professionals
          </CardTitle>
          <span className="text-sm text-muted-foreground">
            {loading ? (
              <Skeleton className="h-4 w-16 inline-block" />
            ) : (
              `${professionals.length} result${professionals.length !== 1 ? "s" : ""}`
            )}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {/* Screen reader announcement */}
        <div aria-live="polite" className="sr-only">
          {!loading && `Showing ${professionals.length} professionals`}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton
                key={i}
                className="h-64 w-full rounded-lg bg-[#C4C4C4]/50"
              />
            ))}
          </div>
        ) : professionals.length > 0 ? (
          <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {professionals.map((therapist) => (
                <motion.div
                  key={therapist._id}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  layout
                  whileHover={{ scale: 1.03 }}
                  transition={{ duration: 0.2 }}
                >
                  <Link
                    href={`/dashboard/professionals/${therapist._id}`}
                    aria-label={`View profile of ${therapist.name}`}
                  >
                    <ProfessionalCard
                      name={therapist.name}
                      imageSrc={therapist.image || ""}
                      location={therapist.location || ""}
                      rating={therapist.rating || 0}
                      reviewCount={therapist.reviewCount || 0}
                      rate={therapist.rate || 0}
                      className="hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20 transition-colors"
                    />
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <EmptyState
            hasFilters={hasActiveFilters}
            onClearFilters={onClearFilters}
          />
        )}
      </CardContent>
    </Card>
  );
}
