// src/hooks/payments/usePaymentDashboard.ts

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  ConfirmationWithDetails,
  EarningWithDetails,
  WeeklyBreakdown,
  MonthlyBreakdown,
  ProfessionalPaymentMethod,
  FeeChargeWithDetails,
} from "@/types/payments";

interface PaymentDashboardData {
  // Current cycle
  currentCycle: {
    id: string;
    startDate: string;
    endDate: string;
    confirmationDeadline: string;
    daysRemaining: number;
    hoursUntilDeadline: number;
    isProcessing: boolean;
  } | null;

  // Current cycle earnings
  currentCycleEarnings: {
    gross: number;
    net: number;
    platformFee: number;
    platformFeePercent: number;
    sessionsCount: number;
    pendingConfirmations: number;
    confirmedCount: number;
  } | null;

  // Lifetime stats
  lifetime: {
    totalGross: number;
    totalNet: number;
    totalPlatformFees: number;
    totalSessions: number;
    totalCharged: number;
  } | null;

  // Payment method status
  paymentMethod: ProfessionalPaymentMethod | null;

  // Pending fees (amount platform will charge professional)
  pendingFees: {
    amount: number;
    cycleCount: number;
  } | null;

  // Recent fee charges
  recentCharges: FeeChargeWithDetails[];

  // Pending confirmations
  pendingConfirmations: (ConfirmationWithDetails & {
    role: "client" | "professional";
  })[];
  pendingConfirmationsCount: number;

  // Recent earnings
  recentEarnings: EarningWithDetails[];

  // Upcoming earnings estimate
  upcomingEarnings: {
    estimatedNet: number;
    estimatedPlatformFee: number;
    sessionsCount: number;
    pendingConfirmations: number;
    estimatedDate: string | null;
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
  hasPendingFees: boolean;
  hasPaymentMethod: boolean;
  isPaymentBlocked: boolean;
  currentCycleProgress: number;
  formattedCycleDateRange: string;
  estimatedPlatformFee: string;
  estimatedNetEarnings: string;
}

export function usePaymentDashboard(): UsePaymentDashboardReturn {
  const { status } = useSession();
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
        if (response.status === 403) {
          // Not a professional - set data to null but don't error
          setData(null);
          setIsLoading(false);
          return;
        }
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
  const hasPendingFees = (data?.pendingFees?.amount ?? 0) > 0;
  const hasPaymentMethod = data?.paymentMethod?.hasPaymentMethod ?? false;
  const isPaymentBlocked = data?.paymentMethod?.isBlocked ?? false;

  // Calculate cycle progress (0-100)
  const currentCycleProgress = (() => {
    if (!data?.currentCycle) return 0;
    // Cycles are ~15 days (1st-15th or 16th-end of month)
    const totalDays = 15;
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

  // Format estimated platform fee
  const estimatedPlatformFee = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(data?.currentCycleEarnings?.platformFee ?? 0);

  // Format estimated net earnings
  const estimatedNetEarnings = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(data?.currentCycleEarnings?.net ?? 0);

  return {
    data,
    isLoading,
    error,
    refetch: fetchDashboard,
    hasEarnings,
    hasPendingConfirmations,
    hasPendingFees,
    hasPaymentMethod,
    isPaymentBlocked,
    currentCycleProgress,
    formattedCycleDateRange,
    estimatedPlatformFee,
    estimatedNetEarnings,
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
    if (status !== "authenticated") {
      setIsLoading(false);
      return;
    }

    const checkPending = async () => {
      try {
        const response = await fetch(
          "/api/payments/confirmation?countOnly=true",
          {
            credentials: "include",
          }
        );

        if (response.ok) {
          const data = await response.json();
          setCount(data.count || 0);
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
