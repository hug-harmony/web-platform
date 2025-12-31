// src/hooks/payments/usePaymentDashboard.ts

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  ProfessionalEarningsSummary,
  ConfirmationWithDetails,
  EarningWithDetails,
  WeeklyBreakdown,
  MonthlyBreakdown,
} from "@/types/payments";

interface PaymentDashboardData {
  // Current cycle
  currentCycle: {
    id: string;
    startDate: string;
    endDate: string;
    daysRemaining: number;
    hoursUntilCutoff: number;
    isProcessing: boolean;
  } | null;

  // Current cycle earnings
  currentCycleEarnings: {
    gross: number;
    platformFee: number;
    net: number;
    sessionsCount: number;
    pendingConfirmations: number;
    confirmedCount: number;
  } | null;

  // Lifetime stats
  lifetime: {
    totalGross: number;
    totalPlatformFees: number;
    totalNet: number;
    totalSessions: number;
    totalPayouts: number;
  } | null;

  // Pending confirmations
  pendingConfirmations: (ConfirmationWithDetails & {
    role: "client" | "professional";
  })[];
  pendingConfirmationsCount: number;

  // Recent earnings
  recentEarnings: EarningWithDetails[];

  // Upcoming payout
  upcomingPayout: {
    estimatedAmount: number;
    estimatedDate: string;
    sessionsCount: number;
    pendingConfirmations: number;
  } | null;

  // History
  weeklyBreakdown: WeeklyBreakdown[];
  monthlyBreakdown: MonthlyBreakdown[] | null;
  showMonthlyView: boolean;
}

interface UsePaymentDashboardReturn {
  data: PaymentDashboardData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;

  // Computed values
  hasEarnings: boolean;
  hasPendingConfirmations: boolean;
  currentCycleProgress: number; // 0-100
  formattedCycleDateRange: string;
}

export function usePaymentDashboard(): UsePaymentDashboardReturn {
  const { data: session, status } = useSession();
  const [data, setData] = useState<PaymentDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    if (status !== "authenticated") return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/payments/dashboard", {
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch dashboard");
      }

      const dashboardData = await response.json();
      setData(dashboardData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [status]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Computed values
  const hasEarnings = (data?.lifetime?.totalSessions ?? 0) > 0;
  const hasPendingConfirmations = (data?.pendingConfirmationsCount ?? 0) > 0;

  // Calculate cycle progress (0-100)
  const currentCycleProgress = (() => {
    if (!data?.currentCycle) return 0;
    const totalDays = 7;
    const daysElapsed = totalDays - data.currentCycle.daysRemaining;
    return Math.min(100, Math.max(0, (daysElapsed / totalDays) * 100));
  })();

  // Format cycle date range
  const formattedCycleDateRange = (() => {
    if (!data?.currentCycle) return "";
    const start = new Date(data.currentCycle.startDate);
    const end = new Date(data.currentCycle.endDate);
    const options: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
    };
    return `${start.toLocaleDateString("en-US", options)} - ${end.toLocaleDateString("en-US", { ...options, year: "numeric" })}`;
  })();

  return {
    data,
    isLoading,
    error,
    refetch: fetchDashboard,
    hasEarnings,
    hasPendingConfirmations,
    currentCycleProgress,
    formattedCycleDateRange,
  };
}

// Helper hook for just checking pending confirmations (lightweight)
export function usePendingConfirmationsCount(): {
  count: number;
  isLoading: boolean;
} {
  const { status } = useSession();
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status !== "authenticated") return;

    const checkPending = async () => {
      try {
        const response = await fetch(
          "/api/payments/confirmation?checkPending=true",
          {
            credentials: "include",
          }
        );

        if (response.ok) {
          const data = await response.json();
          setCount(data.hasPending ? 1 : 0); // We just need to know if there are any
        }
      } catch (err) {
        console.error("Failed to check pending confirmations:", err);
      } finally {
        setIsLoading(false);
      }
    };

    checkPending();
  }, [status]);

  return { count, isLoading };
}
