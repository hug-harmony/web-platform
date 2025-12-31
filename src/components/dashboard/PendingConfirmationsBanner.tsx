// src/components/dashboard/PendingConfirmationsBanner.tsx

"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { AlertCircle, ChevronRight, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { usePendingConfirmationsCount } from "@/hooks/payments";

export function PendingConfirmationsBanner() {
  const [dismissed, setDismissed] = useState(false);
  const { count, isLoading } = usePendingConfirmationsCount();

  if (isLoading || count === 0 || dismissed) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-yellow-200 dark:bg-yellow-800 rounded-full">
            <AlertCircle className="h-5 w-5 text-yellow-700 dark:text-yellow-300" />
          </div>
          <div>
            <p className="font-medium text-yellow-800 dark:text-yellow-200">
              You have pending appointment confirmations
            </p>
            <p className="text-sm text-yellow-700/80 dark:text-yellow-300/80">
              Please confirm whether your recent sessions occurred to process
              payments
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            asChild
            size="sm"
            className="bg-yellow-500 hover:bg-yellow-600 text-white"
          >
            <Link href="/dashboard/payment">
              Review Now
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDismissed(true)}
            className="text-yellow-700 dark:text-yellow-300 hover:bg-yellow-200/50"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
