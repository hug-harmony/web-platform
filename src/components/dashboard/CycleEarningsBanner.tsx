// src/components/dashboard/CycleEarningsBanner.tsx

"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  ChevronRight,
  X,
  Calendar,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useCycleEndBanner } from "@/hooks/payments/useCycleEndBanner";
import { formatCycleDateRange } from "@/lib/utils/paymentCycle";

// ============================================
// 🚨 TESTING FLAGS - REMOVE FOR PRODUCTION 🚨
// ============================================
// Set to true to always show the banner with mock data (bypasses all checks)
const DEBUG_SHOW_BANNER = true;

// Mock data for testing - shows example earnings when DEBUG_SHOW_BANNER is true
const MOCK_EARNINGS = {
  summary: {
    netTotal: 450.0,
    grossTotal: 500.0,
    platformFeeTotal: 50.0,
    sessionsCount: 5,
  },
  cycleStartDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
  cycleEndDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Yesterday
};
// ============================================
// 🚨 END TESTING FLAGS 🚨
// ============================================

export function CycleEarningsBanner() {
  const {
    previousCycleEarnings,
    isNewCycleDay,
    isLoading,
    isDismissed,
    dismiss,
  } = useCycleEndBanner();

  // ============================================
  // 🚨 TESTING LOGIC - REMOVE FOR PRODUCTION 🚨
  // ============================================
  // Use mock data when debugging, otherwise use real data
  const earningsData = DEBUG_SHOW_BANNER
    ? MOCK_EARNINGS
    : previousCycleEarnings;

  // When debugging, skip all the normal checks
  if (DEBUG_SHOW_BANNER) {
    // Only check for dismissal during debug mode
    if (isDismissed) {
      return null;
    }
  } else {
    // ============================================
    // 🚨 PRODUCTION LOGIC - KEEP THIS BLOCK 🚨
    // ============================================
    // Don't render if:
    // - Not a new cycle day
    // - Still loading
    // - Already dismissed
    // - No earnings from previous cycle
    if (!isNewCycleDay || isLoading || isDismissed || !previousCycleEarnings) {
      return null;
    }
  }
  // ============================================
  // 🚨 END TESTING LOGIC 🚨
  // ============================================

  // Safety check - earningsData should always exist at this point
  if (!earningsData) {
    return null;
  }

  const { summary, cycleStartDate, cycleEndDate } = earningsData;
  const { netTotal, sessionsCount } = summary;

  const dateRange = formatCycleDateRange(cycleStartDate, cycleEndDate);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="bg-gradient-to-r from-emerald-50 via-green-50 to-teal-50 dark:from-emerald-900/20 dark:via-green-900/20 dark:to-teal-900/20 border-b border-emerald-200 dark:border-emerald-800"
      >
        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            {/* Left side - Icon and Text */}
            <div className="flex items-start sm:items-center gap-3 flex-1">
              <div className="p-2 bg-emerald-200 dark:bg-emerald-800 rounded-full shrink-0">
                <Sparkles className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-emerald-800 dark:text-emerald-200">
                    New payment cycle started!
                  </p>
                  <span className="text-xs px-2 py-0.5 bg-emerald-200/50 dark:bg-emerald-700/50 rounded-full text-emerald-700 dark:text-emerald-300">
                    {dateRange}
                  </span>
                </div>

                <div className="flex items-center gap-4 mt-1 text-sm">
                  <div className="flex items-center gap-1.5 text-emerald-700/80 dark:text-emerald-300/80">
                    <TrendingUp className="h-4 w-4" />
                    <span>
                      Last week:{" "}
                      <span className="font-semibold">
                        ${netTotal.toFixed(2)}
                      </span>{" "}
                      earned
                    </span>
                  </div>
                  <div className="hidden sm:flex items-center gap-1.5 text-emerald-700/60 dark:text-emerald-300/60">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {sessionsCount} session{sessionsCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right side - Actions */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                asChild
                size="sm"
                className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Link href="/dashboard/payment">
                  <DollarSign className="h-4 w-4 mr-1" />
                  View Earnings
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={dismiss}
                className="text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200/50 dark:hover:bg-emerald-800/50 shrink-0"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Mobile session count */}
          <div className="sm:hidden flex items-center gap-1.5 text-xs text-emerald-700/60 dark:text-emerald-300/60 mt-2 ml-11">
            <Calendar className="h-3.5 w-3.5" />
            <span>
              {sessionsCount} session{sessionsCount !== 1 ? "s" : ""} completed
            </span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ============================================
// 📋 PRODUCTION CLEANUP CHECKLIST:
// ============================================
// When you're done testing, do the following:
//
// 1. Delete or set to false:
//    const DEBUG_SHOW_BANNER = false; // or delete entirely
//
// 2. Delete the MOCK_EARNINGS constant entirely
//
// 3. Replace the entire conditional logic block with just:
//    if (!isNewCycleDay || isLoading || isDismissed || !previousCycleEarnings) {
//      return null;
//    }
//    const { summary, cycleStartDate, cycleEndDate } = previousCycleEarnings;
//
// 4. Delete all comments marked with 🚨
// ============================================
