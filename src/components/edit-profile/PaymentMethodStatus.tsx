// src/components/edit-profile/PaymentMethodStatus.tsx

"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Check, AlertTriangle, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { ProfessionalPaymentMethod } from "@/types/payments";

interface PaymentMethodStatusProps {
  professionalId: string;
}

export function PaymentMethodStatus({
  professionalId,
}: PaymentMethodStatusProps) {
  const router = useRouter();
  const [paymentMethod, setPaymentMethod] =
    useState<ProfessionalPaymentMethod | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPaymentMethod = async () => {
      try {
        const response = await fetch("/api/payments/payment-method", {
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          setPaymentMethod(data);
        }
      } catch (error) {
        console.error("Failed to fetch payment method:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (professionalId) {
      fetchPaymentMethod();
    }
  }, [professionalId]);

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
      </div>
    );
  }

  const formatCardBrand = (brand: string | null | undefined) => {
    if (!brand) return "Card";
    return brand.charAt(0).toUpperCase() + brand.slice(1);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-black dark:text-white">
        Payment Method
      </h3>

      <Card
        className={
          paymentMethod?.isBlocked ? "border-red-300 dark:border-red-800" : ""
        }
      >
        <CardContent className="pt-4">
          {paymentMethod?.hasPaymentMethod ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#F3CFC6]/20 rounded-lg">
                  <CreditCard className="w-5 h-5 text-[#F3CFC6]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-black dark:text-white">
                      {formatCardBrand(paymentMethod.cardBrand)} ••••{" "}
                      {paymentMethod.cardLast4}
                    </p>
                    {!paymentMethod.isBlocked && (
                      <Badge
                        variant="secondary"
                        className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-xs"
                      >
                        <Check className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-[#C4C4C4]">
                    For platform fee collection
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/dashboard/payment")}
                className="border-[#F3CFC6] text-[#F3CFC6] hover:bg-[#F3CFC6]/10"
              >
                Manage
                <ExternalLink className="w-3 h-3 ml-1" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-medium text-black dark:text-white">
                    No payment method
                  </p>
                  <p className="text-xs text-[#C4C4C4]">
                    Add a card to accept appointments
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => router.push("/dashboard/payment")}
                className="bg-[#F3CFC6] hover:bg-[#F3CFC6]/80 text-black"
              >
                Add Card
              </Button>
            </div>
          )}

          {paymentMethod?.isBlocked && (
            <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-xs text-red-600 dark:text-red-400">
                {paymentMethod.blockedReason ||
                  "Account restricted - update payment method"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
