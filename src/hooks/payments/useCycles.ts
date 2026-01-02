// src/hooks/payments/useCycles.ts

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { PayoutCycle, CycleInfo, EarningWithDetails } from "@/types/payments";

// ============================================
// CURRENT CYCLE HOOK
// ============================================

export function useCurrentCycle(): {
  cycle: CycleInfo | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  // Computed
  daysRemaining: number;
  hoursUntilDeadline: number;
  isActive: boolean;
  formattedDateRange: string;
  progressPercent: number;
} {
  const { status: authStatus } = useSession();
  const [cycle, setCycle] = useState<CycleInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCycle = useCallback(async () => {
    if (authStatus !== "authenticated") return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/payments/cycles?current=true", {
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch current cycle");
      }

      const data = await response.json();
      setCycle(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [authStatus]);

  useEffect(() => {
    fetchCycle();
  }, [fetchCycle]);

  // Computed values
  const daysRemaining = cycle?.daysRemaining ?? 0;
  const hoursUntilDeadline = cycle?.hoursUntilDeadline ?? 0;
  const isActive = cycle?.current?.status === "active";

  const formattedDateRange = (() => {
    if (!cycle?.current) return "";
    const start = new Date(cycle.current.startDate);
    const end = new Date(cycle.current.endDate);
    const options: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
    };
    return `${start.toLocaleDateString("en-US", options)} - ${end.toLocaleDateString("en-US", { ...options, year: "numeric" })}`;
  })();

  // Cycles are ~15 days
  const progressPercent = (() => {
    if (!cycle) return 0;
    const totalDays = 15;
    const daysElapsed = totalDays - daysRemaining;
    return Math.min(100, Math.max(0, (daysElapsed / totalDays) * 100));
  })();

  return {
    cycle,
    isLoading,
    error,
    refetch: fetchCycle,
    daysRemaining,
    hoursUntilDeadline,
    isActive,
    formattedDateRange,
    progressPercent,
  };
}

// ============================================
// CYCLES HISTORY HOOK
// ============================================

interface UseCyclesOptions {
  page?: number;
  limit?: number;
}

export function useCycles(options: UseCyclesOptions = {}): {
  cycles: PayoutCycle[];
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
} {
  const { status: authStatus } = useSession();
  const [cycles, setCycles] = useState<PayoutCycle[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: options.page || 1,
    limit: options.limit || 10,
    hasMore: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { page = 1, limit = 10 } = options;

  const fetchCycles = useCallback(
    async (pageNum: number = page, append: boolean = false) => {
      if (authStatus !== "authenticated") return;

      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          page: String(pageNum),
          limit: String(limit),
        });

        const response = await fetch(`/api/payments/cycles?${params}`, {
          credentials: "include",
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch cycles");
        }

        const data = await response.json();

        setCycles((prev) => (append ? [...prev, ...data.data] : data.data));
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
    [authStatus, page, limit]
  );

  useEffect(() => {
    fetchCycles();
  }, [fetchCycles]);

  const loadMore = async () => {
    if (pagination.hasMore && !isLoading) {
      await fetchCycles(pagination.page + 1, true);
    }
  };

  return {
    cycles,
    pagination,
    isLoading,
    error,
    refetch: () => fetchCycles(1, false),
    loadMore,
  };
}

// ============================================
// SINGLE CYCLE WITH EARNINGS HOOK
// ============================================

interface CycleWithEarnings {
  cycleId: string;
  earnings: EarningWithDetails[];
  summary: {
    grossTotal: number;
    platformFeeTotal: number;
    count: number;
  };
}

export function useCycleEarnings(cycleId: string | null): {
  data: CycleWithEarnings | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const { status: authStatus } = useSession();
  const [data, setData] = useState<CycleWithEarnings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCycleEarnings = useCallback(async () => {
    if (authStatus !== "authenticated" || !cycleId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/payments/cycles/${cycleId}`, {
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch cycle earnings");
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [authStatus, cycleId]);

  useEffect(() => {
    if (cycleId) {
      fetchCycleEarnings();
    }
  }, [fetchCycleEarnings, cycleId]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchCycleEarnings,
  };
}
