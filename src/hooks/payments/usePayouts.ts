// src/hooks/payments/usePayouts.ts

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  PayoutHistoryItem,
  PayoutWithDetails,
  PayoutStatus,
  PayoutsResponse,
} from "@/types/payments";

// ============================================
// PAYOUTS LIST HOOK
// ============================================

interface UsePayoutsOptions {
  status?: PayoutStatus;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
  autoFetch?: boolean;
}

interface UsePayoutsReturn {
  payouts: PayoutHistoryItem[];
  summary: {
    totalPaid: number;
    totalPending: number;
  };
  pagination: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  loadMore: () => Promise<void>;
}

export function usePayouts(options: UsePayoutsOptions = {}): UsePayoutsReturn {
  const { status: authStatus } = useSession();
  const [payouts, setPayouts] = useState<PayoutHistoryItem[]>([]);
  const [summary, setSummary] = useState({
    totalPaid: 0,
    totalPending: 0,
  });
  const [pagination, setPagination] = useState({
    total: 0,
    page: options.page || 1,
    limit: options.limit || 10,
    hasMore: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    status,
    startDate,
    endDate,
    page = 1,
    limit = 10,
    autoFetch = true,
  } = options;

  const fetchPayouts = useCallback(
    async (pageNum: number = page, append: boolean = false) => {
      if (authStatus !== "authenticated") return;

      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          page: String(pageNum),
          limit: String(limit),
        });

        if (status) params.set("status", status);
        if (startDate) params.set("startDate", startDate.toISOString());
        if (endDate) params.set("endDate", endDate.toISOString());

        const response = await fetch(`/api/payments/payouts?${params}`, {
          credentials: "include",
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch payouts");
        }

        const data: PayoutsResponse = await response.json();

        setPayouts((prev) => (append ? [...prev, ...data.data] : data.data));
        setSummary(data.summary);
        setPagination({
          total: data.total,
          page: data.page,
          limit: data.limit,
          hasMore: data.hasMore,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    },
    [authStatus, status, startDate, endDate, page, limit]
  );

  useEffect(() => {
    if (autoFetch) {
      fetchPayouts();
    }
  }, [fetchPayouts, autoFetch]);

  const loadMore = async () => {
    if (pagination.hasMore && !isLoading) {
      await fetchPayouts(pagination.page + 1, true);
    }
  };

  return {
    payouts,
    summary,
    pagination,
    isLoading,
    error,
    refetch: () => fetchPayouts(1, false),
    loadMore,
  };
}

// ============================================
// UPCOMING PAYOUT HOOK
// ============================================

interface UpcomingPayout {
  estimatedAmount: number;
  estimatedDate: Date;
  sessionsCount: number;
  pendingConfirmations: number;
}

export function useUpcomingPayout(): {
  payout: UpcomingPayout | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  // Computed
  hasUpcoming: boolean;
  formattedAmount: string;
  formattedDate: string;
} {
  const { status: authStatus } = useSession();
  const [payout, setPayout] = useState<UpcomingPayout | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUpcoming = useCallback(async () => {
    if (authStatus !== "authenticated") return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/payments/payouts?upcoming=true", {
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch upcoming payout");
      }

      const data = await response.json();

      if (data.upcoming) {
        setPayout({
          ...data.upcoming,
          estimatedDate: new Date(data.upcoming.estimatedDate),
        });
      } else {
        setPayout(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [authStatus]);

  useEffect(() => {
    fetchUpcoming();
  }, [fetchUpcoming]);

  // Computed values
  const hasUpcoming = payout !== null && payout.estimatedAmount > 0;

  const formattedAmount = payout
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(payout.estimatedAmount)
    : "$0.00";

  const formattedDate = payout
    ? payout.estimatedDate.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      })
    : "";

  return {
    payout,
    isLoading,
    error,
    refetch: fetchUpcoming,
    hasUpcoming,
    formattedAmount,
    formattedDate,
  };
}

// ============================================
// SINGLE PAYOUT HOOK
// ============================================

export function usePayout(payoutId: string | null): {
  payout: PayoutWithDetails | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const { status: authStatus } = useSession();
  const [payout, setPayout] = useState<PayoutWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPayout = useCallback(async () => {
    if (authStatus !== "authenticated" || !payoutId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/payments/payouts/${payoutId}`, {
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch payout");
      }

      const data = await response.json();
      setPayout(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [authStatus, payoutId]);

  useEffect(() => {
    if (payoutId) {
      fetchPayout();
    }
  }, [fetchPayout, payoutId]);

  return {
    payout,
    isLoading,
    error,
    refetch: fetchPayout,
  };
}
