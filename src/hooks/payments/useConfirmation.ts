// src/hooks/payments/useConfirmation.ts

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  ConfirmationWithDetails,
  ConfirmationResponse,
} from "@/types/payments";

// ============================================
// PENDING CONFIRMATIONS HOOK
// ============================================

interface PendingConfirmationsData {
  asClient: ConfirmationWithDetails[];
  asProfessional: ConfirmationWithDetails[];
  total: number;
}

export function usePendingConfirmations(): {
  data: PendingConfirmationsData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  // Computed
  hasAny: boolean;
  clientCount: number;
  professionalCount: number;
} {
  const { status: authStatus } = useSession();
  const [data, setData] = useState<PendingConfirmationsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPending = useCallback(async () => {
    if (authStatus !== "authenticated") return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/payments/confirmation", {
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch confirmations");
      }

      const pendingData = await response.json();
      setData(pendingData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [authStatus]);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  // Computed values
  const hasAny = (data?.total ?? 0) > 0;
  const clientCount = data?.asClient?.length ?? 0;
  const professionalCount = data?.asProfessional?.length ?? 0;

  return {
    data,
    isLoading,
    error,
    refetch: fetchPending,
    hasAny,
    clientCount,
    professionalCount,
  };
}

// ============================================
// SINGLE CONFIRMATION HOOK
// ============================================

export function useConfirmation(appointmentId: string | null): {
  confirmation: ConfirmationWithDetails | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  // Actions
  confirm: (
    occurred: boolean,
    review?: { rating: number; feedback: string }
  ) => Promise<ConfirmationResponse>;
  isSubmitting: boolean;
  submitError: string | null;
} {
  const { status: authStatus } = useSession();
  const [confirmation, setConfirmation] =
    useState<ConfirmationWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fetchConfirmation = useCallback(async () => {
    if (authStatus !== "authenticated" || !appointmentId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/payments/confirmation?appointmentId=${appointmentId}`,
        { credentials: "include" }
      );

      if (!response.ok) {
        if (response.status === 404) {
          setConfirmation(null);
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch confirmation");
      }

      const data = await response.json();
      setConfirmation(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [authStatus, appointmentId]);

  useEffect(() => {
    if (appointmentId) {
      fetchConfirmation();
    }
  }, [fetchConfirmation, appointmentId]);

  const confirm = async (
    occurred: boolean,
    review?: { rating: number; feedback: string }
  ): Promise<ConfirmationResponse> => {
    if (!appointmentId) {
      throw new Error("No appointment ID provided");
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/payments/confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          appointmentId,
          confirmed: occurred,
          review,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit confirmation");
      }

      const result: ConfirmationResponse = await response.json();

      // Refresh the confirmation data
      await fetchConfirmation();

      return result;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      setSubmitError(errorMessage);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    confirmation,
    isLoading,
    error,
    refetch: fetchConfirmation,
    confirm,
    isSubmitting,
    submitError,
  };
}

// ============================================
// CONFIRMATION ACTION HOOK (Standalone)
// ============================================

interface UseConfirmAppointmentReturn {
  confirm: (
    appointmentId: string,
    occurred: boolean,
    review?: { rating: number; feedback: string }
  ) => Promise<ConfirmationResponse>;
  isSubmitting: boolean;
  error: string | null;
  lastResult: ConfirmationResponse | null;
  reset: () => void;
}

export function useConfirmAppointment(): UseConfirmAppointmentReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<ConfirmationResponse | null>(
    null
  );

  const confirm = async (
    appointmentId: string,
    occurred: boolean,
    review?: { rating: number; feedback: string }
  ): Promise<ConfirmationResponse> => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/payments/confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          appointmentId,
          confirmed: occurred,
          review,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit confirmation");
      }

      const result: ConfirmationResponse = await response.json();
      setLastResult(result);
      return result;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const reset = () => {
    setError(null);
    setLastResult(null);
  };

  return {
    confirm,
    isSubmitting,
    error,
    lastResult,
    reset,
  };
}

// ============================================
// MARK APPOINTMENT COMPLETE HOOK
// ============================================

export function useCompleteAppointment(): {
  complete: (
    appointmentId: string
  ) => Promise<{ confirmation: ConfirmationWithDetails }>;
  isSubmitting: boolean;
  error: string | null;
} {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const complete = async (appointmentId: string) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/appointment/${appointmentId}/complete`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to complete appointment");
      }

      return await response.json();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    complete,
    isSubmitting,
    error,
  };
}
