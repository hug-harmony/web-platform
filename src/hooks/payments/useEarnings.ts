// src/hooks/payments/useEarnings.ts

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  EarningWithDetails,
  EarningStatus,
  WeeklyBreakdown,
  MonthlyBreakdown,
  EarningsResponse,
} from "@/types/payments";

// ============================================
// EARNINGS LIST HOOK
// ============================================

interface UseEarningsOptions {
  status?: EarningStatus;
  cycleId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
  autoFetch?: boolean;
}

interface UseEarningsReturn {
  earnings: EarningWithDetails[];
  summary: {
    totalGross: number;
    totalPlatformFees: number;
    totalNet: number;
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

export function useEarnings(
  options: UseEarningsOptions = {}
): UseEarningsReturn {
  const { status: authStatus } = useSession();
  const [earnings, setEarnings] = useState<EarningWithDetails[]>([]);
  const [summary, setSummary] = useState({
    totalGross: 0,
    totalPlatformFees: 0,
    totalNet: 0,
  });
  const [pagination, setPagination] = useState({
    total: 0,
    page: options.page || 1,
    limit: options.limit || 20,
    hasMore: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    status,
    cycleId,
    startDate,
    endDate,
    page = 1,
    limit = 20,
    autoFetch = true,
  } = options;

  const fetchEarnings = useCallback(
    async (pageNum: number = page, append: boolean = false) => {
      if (authStatus !== "authenticated") return;

      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          view: "list",
          page: String(pageNum),
          limit: String(limit),
        });

        if (status) params.set("status", status);
        if (cycleId) params.set("cycleId", cycleId);
        if (startDate) params.set("startDate", startDate.toISOString());
        if (endDate) params.set("endDate", endDate.toISOString());

        const response = await fetch(`/api/payments/earnings?${params}`, {
          credentials: "include",
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch earnings");
        }

        const data: EarningsResponse = await response.json();

        setEarnings((prev) => (append ? [...prev, ...data.data] : data.data));
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
    [authStatus, status, cycleId, startDate, endDate, page, limit]
  );

  useEffect(() => {
    if (autoFetch) {
      fetchEarnings();
    }
  }, [fetchEarnings, autoFetch]);

  const loadMore = async () => {
    if (pagination.hasMore && !isLoading) {
      await fetchEarnings(pagination.page + 1, true);
    }
  };

  return {
    earnings,
    summary,
    pagination,
    isLoading,
    error,
    refetch: () => fetchEarnings(1, false),
    loadMore,
  };
}

// ============================================
// EARNINGS SUMMARY HOOK
// ============================================

interface EarningsSummary {
  currentCycle: {
    gross: number;
    platformFee: number;
    net: number;
    sessionsCount: number;
    pendingCount: number;
    confirmedCount: number;
  };
  lifetime: {
    totalGross: number;
    totalPlatformFees: number;
    totalNet: number;
    totalSessions: number;
    totalPaidOut: number;
  };
}

export function useEarningsSummary(): {
  data: EarningsSummary | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const { status: authStatus } = useSession();
  const [data, setData] = useState<EarningsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    if (authStatus !== "authenticated") return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/payments/earnings?view=summary", {
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch summary");
      }

      const summaryData = await response.json();
      setData(summaryData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [authStatus]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchSummary,
  };
}

// ============================================
// WEEKLY BREAKDOWN HOOK
// ============================================

interface UseWeeklyBreakdownOptions {
  page?: number;
  limit?: number;
}

export function useWeeklyBreakdown(options: UseWeeklyBreakdownOptions = {}): {
  data: WeeklyBreakdown[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  loadMore: () => Promise<void>;
  hasMore: boolean;
} {
  const { status: authStatus } = useSession();
  const [data, setData] = useState<WeeklyBreakdown[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(options.page || 1);
  const [hasMore, setHasMore] = useState(false);

  const { limit = 10 } = options;

  const fetchWeekly = useCallback(
    async (pageNum: number = 1, append: boolean = false) => {
      if (authStatus !== "authenticated") return;

      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          view: "weekly",
          page: String(pageNum),
          limit: String(limit),
        });

        const response = await fetch(`/api/payments/earnings?${params}`, {
          credentials: "include",
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || "Failed to fetch weekly breakdown"
          );
        }

        const result = await response.json();

        setData((prev) => (append ? [...prev, ...result.data] : result.data));
        setPage(pageNum);
        setHasMore(result.data.length === limit);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    },
    [authStatus, limit]
  );

  useEffect(() => {
    fetchWeekly();
  }, [fetchWeekly]);

  const loadMore = async () => {
    if (hasMore && !isLoading) {
      await fetchWeekly(page + 1, true);
    }
  };

  return {
    data,
    isLoading,
    error,
    refetch: () => fetchWeekly(1, false),
    loadMore,
    hasMore,
  };
}

// ============================================
// MONTHLY BREAKDOWN HOOK
// ============================================

interface UseMonthlyBreakdownOptions {
  year?: number;
  limit?: number;
}

export function useMonthlyBreakdown(options: UseMonthlyBreakdownOptions = {}): {
  data: MonthlyBreakdown[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  setYear: (year: number) => void;
  selectedYear: number | undefined;
} {
  const { status: authStatus } = useSession();
  const [data, setData] = useState<MonthlyBreakdown[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(options.year);

  const { limit = 12 } = options;

  const fetchMonthly = useCallback(async () => {
    if (authStatus !== "authenticated") return;

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        view: "monthly",
        limit: String(limit),
      });

      if (selectedYear) {
        params.set("year", String(selectedYear));
      }

      const response = await fetch(`/api/payments/earnings?${params}`, {
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch monthly breakdown");
      }

      const result = await response.json();
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [authStatus, selectedYear, limit]);

  useEffect(() => {
    fetchMonthly();
  }, [fetchMonthly]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchMonthly,
    setYear: setSelectedYear,
    selectedYear,
  };
}

// ============================================
// SINGLE EARNING HOOK
// ============================================

export function useEarning(earningId: string | null): {
  earning: EarningWithDetails | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const { status: authStatus } = useSession();
  const [earning, setEarning] = useState<EarningWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEarning = useCallback(async () => {
    if (authStatus !== "authenticated" || !earningId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/payments/earnings/${earningId}`, {
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch earning");
      }

      const data = await response.json();
      setEarning(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [authStatus, earningId]);

  useEffect(() => {
    if (earningId) {
      fetchEarning();
    }
  }, [fetchEarning, earningId]);

  return {
    earning,
    isLoading,
    error,
    refetch: fetchEarning,
  };
}
