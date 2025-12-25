// src/app/dashboard/profile/[id]/DiscountsSection.tsx

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign } from "lucide-react";
import type { ProfileDiscount } from "@/types/profile";

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

function DiscountCard({ discount }: { discount: ProfileDiscount }) {
  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ scale: 1.05, boxShadow: "0 8px 16px rgba(0,0,0,0.1)" }}
      transition={{ duration: 0.2 }}
    >
      <Card className="hover:bg-[#fff]/80 dark:hover:bg-[#C4C4C4]/20 transition-colors">
        <CardContent className="pt-4">
          <div className="flex items-center space-x-2">
            <DollarSign className="h-6 w-6 text-[#F3CFC6]" />
            <div>
              <h3 className="font-semibold">{discount.name}</h3>
              <p className="text-sm text-[#C4C4C4]">
                {discount.discount}% off ${discount.rate}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface DiscountsSectionProps {
  discounts: ProfileDiscount[];
}

export default function DiscountsSection({ discounts }: DiscountsSectionProps) {
  return (
    <motion.div variants={itemVariants}>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-black dark:text-white">
            Available Discounts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6"
            variants={containerVariants}
          >
            <AnimatePresence>
              {discounts.map((discount) => (
                <DiscountCard key={discount.id} discount={discount} />
              ))}
            </AnimatePresence>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
