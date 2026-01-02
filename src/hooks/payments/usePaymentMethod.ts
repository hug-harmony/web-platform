// src/hooks/payments/usePaymentMethod.ts

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  ProfessionalPaymentMethod,
  SetupPaymentMethodResponse,
} from "@/types/payments";

// ============================================
// PAYMENT METHOD STATUS HOOK
// ============================================

export function usePaymentMethod(): {
  paymentMethod: ProfessionalPaymentMethod | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  // Computed
  hasPaymentMethod: boolean;
  isBlocked: boolean;
  cardDisplay: string;
} {
  const { status: authStatus } = useSession();
  const [paymentMethod, setPaymentMethod] =
    useState<ProfessionalPaymentMethod | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPaymentMethod = useCallback(async () => {
    if (authStatus !== "authenticated") return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/payments/payment-method", {
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 403) {
          // Not a professional, that's okay
          setIsLoading(false);
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch payment method");
      }

      const data = await response.json();
      setPaymentMethod(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [authStatus]);

  useEffect(() => {
    fetchPaymentMethod();
  }, [fetchPaymentMethod]);

  // Computed values
  const hasPaymentMethod = paymentMethod?.hasPaymentMethod ?? false;
  const isBlocked = paymentMethod?.isBlocked ?? false;

  const cardDisplay = paymentMethod?.hasPaymentMethod
    ? `${paymentMethod.cardBrand?.toUpperCase() || "Card"} •••• ${paymentMethod.cardLast4}`
    : "No card on file";

  return {
    paymentMethod,
    isLoading,
    error,
    refetch: fetchPaymentMethod,
    hasPaymentMethod,
    isBlocked,
    cardDisplay,
  };
}

// ============================================
// SETUP PAYMENT METHOD HOOK
// ============================================

export function useSetupPaymentMethod(): {
  setupIntent: SetupPaymentMethodResponse | null;
  isLoading: boolean;
  error: string | null;
  startSetup: () => Promise<SetupPaymentMethodResponse>;
  confirmSetup: (
    paymentMethodId: string,
    cardDetails: {
      last4: string;
      brand: string;
      expiryMonth: number;
      expiryYear: number;
    }
  ) => Promise<ProfessionalPaymentMethod>;
  isConfirming: boolean;
  confirmError: string | null;
} {
  const [setupIntent, setSetupIntent] =
    useState<SetupPaymentMethodResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const startSetup = async (): Promise<SetupPaymentMethodResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        "/api/payments/payment-method?action=setup",
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to start payment setup");
      }

      const data: SetupPaymentMethodResponse = await response.json();
      setSetupIntent(data);
      return data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const confirmSetup = async (
    paymentMethodId: string,
    cardDetails: {
      last4: string;
      brand: string;
      expiryMonth: number;
      expiryYear: number;
    }
  ): Promise<ProfessionalPaymentMethod> => {
    setIsConfirming(true);
    setConfirmError(null);

    try {
      const response = await fetch("/api/payments/payment-method", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          paymentMethodId,
          cardDetails,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to confirm payment method");
      }

      const data = await response.json();
      return data.paymentMethod;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      setConfirmError(errorMessage);
      throw err;
    } finally {
      setIsConfirming(false);
    }
  };

  return {
    setupIntent,
    isLoading,
    error,
    startSetup,
    confirmSetup,
    isConfirming,
    confirmError,
  };
}

// ============================================
// REMOVE PAYMENT METHOD HOOK
// ============================================

export function useRemovePaymentMethod(): {
  remove: () => Promise<void>;
  isRemoving: boolean;
  error: string | null;
} {
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async (): Promise<void> => {
    setIsRemoving(true);
    setError(null);

    try {
      const response = await fetch("/api/payments/payment-method", {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to remove payment method");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
      throw err;
    } finally {
      setIsRemoving(false);
    }
  };

  return {
    remove,
    isRemoving,
    error,
  };
}
