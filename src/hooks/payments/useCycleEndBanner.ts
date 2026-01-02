// src/hooks/payments/useCycleEndBanner.ts

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { getCycleDates, getPreviousCycleDates } from "@/lib/utils/paymentCycle";

interface PreviousCycleEarnings {
  grossTotal: number;
  platformFeeTotal: number;
  sessionsCount: number;
}

interface CycleEndBannerData {
  previousCycleEarnings: {
    summary: PreviousCycleEarnings;
    cycleStartDate: Date;
    cycleEndDate: Date;
  } | null;
  isNewCycleDay: boolean;
  isLoading: boolean;
  error: string | null;
  dismiss: () => void;
  isDismissed: boolean;
}

const DISMISS_KEY_PREFIX = "cycle_banner_dismissed_";

// Set to true to always show the banner (for testing)
const DEBUG_ALWAYS_SHOW = false;

/**
 * Hook to manage the cycle end notification banner
 * Shows on the first day of a new cycle with previous cycle earnings summary
 */
export function useCycleEndBanner(): CycleEndBannerData {
  const { data: session, status: sessionStatus } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [previousCycleEarnings, setPreviousCycleEarnings] =
    useState<CycleEndBannerData["previousCycleEarnings"]>(null);

  // Check if today is the first day of a new cycle (1st or 16th)
  const currentCycle = getCycleDates();
  const today = new Date();
  const cycleStartDay = currentCycle.startDate;

  // Check if we're on the same day as cycle start
  const isActuallyNewCycleDay =
    today.getUTCFullYear() === cycleStartDay.getUTCFullYear() &&
    today.getUTCMonth() === cycleStartDay.getUTCMonth() &&
    today.getUTCDate() === cycleStartDay.getUTCDate();

  const isNewCycleDay = DEBUG_ALWAYS_SHOW || isActuallyNewCycleDay;

  // Generate dismiss key based on the previous cycle's end date
  const previousCycle = getPreviousCycleDates(new Date());
  const dismissKey = `${DISMISS_KEY_PREFIX}${previousCycle.endDate.toISOString().split("T")[0]}`;

  // Check localStorage for dismissal
  useEffect(() => {
    if (DEBUG_ALWAYS_SHOW) {
      setIsDismissed(false);
      return;
    }

    if (typeof window !== "undefined") {
      const dismissed = localStorage.getItem(dismissKey);
      if (dismissed === "true") {
        setIsDismissed(true);
      }
    }
  }, [dismissKey]);

  // Fetch previous cycle earnings
  useEffect(() => {
    async function fetchPreviousCycleEarnings() {
      if (sessionStatus === "loading") {
        return;
      }

      if (!isNewCycleDay) {
        setIsLoading(false);
        return;
      }

      if (!session?.user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        const response = await fetch(
          `/api/payments/earnings?view=previous-cycle`
        );

        if (response.status === 403) {
          setIsLoading(false);
          return;
        }

        if (!response.ok) {
          throw new Error("Failed to fetch previous cycle earnings");
        }

        const data = await response.json();

        if (data.hasPreviousCycleEarnings && data.summary) {
          setPreviousCycleEarnings({
            summary: data.summary,
            cycleStartDate: new Date(data.cycle.startDate),
            cycleEndDate: new Date(data.cycle.endDate),
          });
        }
      } catch (err) {
        console.error("Error fetching previous cycle earnings:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    }

    fetchPreviousCycleEarnings();
  }, [isNewCycleDay, session?.user?.id, sessionStatus]);

  const dismiss = useCallback(() => {
    setIsDismissed(true);
    if (!DEBUG_ALWAYS_SHOW && typeof window !== "undefined") {
      localStorage.setItem(dismissKey, "true");
    }
  }, [dismissKey]);

  return {
    previousCycleEarnings,
    isNewCycleDay,
    isLoading,
    error,
    dismiss,
    isDismissed,
  };
}
