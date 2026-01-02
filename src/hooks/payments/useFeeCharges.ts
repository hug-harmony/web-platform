// src/hooks/payments/useFeeCharges.ts

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  FeeChargeWithDetails,
  FeeChargeStatus,
  FeeChargesResponse,
} from "@/types/payments";

// ============================================
// FEE CHARGES LIST HOOK
// ============================================

interface UseFeeChargesOptions {
  status?: FeeChargeStatus;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
  autoFetch?: boolean;
}

interface UseFeeChargesReturn {
  feeCharges: FeeChargeWithDetails[];
  summary: {
    totalCharged: number;
    totalPending: number;
    totalFailed: number;
    totalWaived: number;
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

export function useFeeCharges(
  options: UseFeeChargesOptions = {}
): UseFeeChargesReturn {
  const { status: authStatus } = useSession();
  const [feeCharges, setFeeCharges] = useState<FeeChargeWithDetails[]>([]);
  const [summary, setSummary] = useState({
    totalCharged: 0,
    totalPending: 0,
    totalFailed: 0,
    totalWaived: 0,
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

  const fetchFeeCharges = useCallback(
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

        const response = await fetch(`/api/payments/fee-charges?${params}`, {
          credentials: "include",
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch fee charges");
        }

        const data: FeeChargesResponse = await response.json();

        setFeeCharges((prev) => (append ? [...prev, ...data.data] : data.data));
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
      fetchFeeCharges();
    }
  }, [fetchFeeCharges, autoFetch]);

  const loadMore = async () => {
    if (pagination.hasMore && !isLoading) {
      await fetchFeeCharges(pagination.page + 1, true);
    }
  };

  return {
    feeCharges,
    summary,
    pagination,
    isLoading,
    error,
    refetch: () => fetchFeeCharges(1, false),
    loadMore,
  };
}

// ============================================
// PENDING FEES HOOK
// ============================================

interface PendingFees {
  amount: number;
  cycleCount: number;
}

export function usePendingFees(): {
  pendingFees: PendingFees | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  // Computed
  hasPendingFees: boolean;
  formattedAmount: string;
} {
  const { status: authStatus } = useSession();
  const [pendingFees, setPendingFees] = useState<PendingFees | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPendingFees = useCallback(async () => {
    if (authStatus !== "authenticated") return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        "/api/payments/fee-charges?pendingOnly=true",
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch pending fees");
      }

      const data = await response.json();
      setPendingFees(data.pendingFees);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [authStatus]);

  useEffect(() => {
    fetchPendingFees();
  }, [fetchPendingFees]);

  // Computed values
  const hasPendingFees = (pendingFees?.amount ?? 0) > 0;

  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(pendingFees?.amount ?? 0);

  return {
    pendingFees,
    isLoading,
    error,
    refetch: fetchPendingFees,
    hasPendingFees,
    formattedAmount,
  };
}

// ============================================
// SINGLE FEE CHARGE HOOK
// ============================================

export function useFeeCharge(feeChargeId: string | null): {
  feeCharge: FeeChargeWithDetails | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const { status: authStatus } = useSession();
  const [feeCharge, setFeeCharge] = useState<FeeChargeWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFeeCharge = useCallback(async () => {
    if (authStatus !== "authenticated" || !feeChargeId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/payments/fee-charges/${feeChargeId}`, {
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch fee charge");
      }

      const data = await response.json();
      setFeeCharge(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [authStatus, feeChargeId]);

  useEffect(() => {
    if (feeChargeId) {
      fetchFeeCharge();
    }
  }, [fetchFeeCharge, feeChargeId]);

  return {
    feeCharge,
    isLoading,
    error,
    refetch: fetchFeeCharge,
  };
}
