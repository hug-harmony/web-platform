"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CreditCard,
  Check,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
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

  const formatCardBrand = (brand: string | null | undefined) => {
    if (!brand) return "Card";
    return brand.charAt(0).toUpperCase() + brand.slice(1);
  };

  if (isLoading) {
    return (
      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-9 w-24 rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasPayment = paymentMethod?.hasPaymentMethod;
  const isBlocked = paymentMethod?.isBlocked;

  return (
    <Card
      className={`border shadow-sm transition-colors ${
        isBlocked
          ? "border-red-300 bg-red-50/50"
          : hasPayment
            ? "border-gray-200"
            : "border-yellow-300 bg-yellow-50/50"
      }`}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-[#F3CFC6]" />
          Platform Payment Method
        </CardTitle>
      </CardHeader>
      <CardContent>
        {hasPayment ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div
                  className={`h-12 w-12 rounded-full flex items-center justify-center ${
                    isBlocked ? "bg-red-100" : "bg-green-100"
                  }`}
                >
                  {isBlocked ? (
                    <ShieldAlert className="h-6 w-6 text-red-600" />
                  ) : (
                    <ShieldCheck className="h-6 w-6 text-green-600" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-black">
                      {formatCardBrand(paymentMethod.cardBrand)} ••••{" "}
                      {paymentMethod.cardLast4}
                    </p>
                    {!isBlocked && (
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                        <Check className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    )}
                    {isBlocked && (
                      <Badge variant="destructive">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Blocked
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Used for platform fee collection
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/dashboard/payment")}
                className="rounded-full border-[#F3CFC6] text-gray-700 hover:bg-[#F3CFC6]/10"
              >
                Manage
                <ExternalLink className="w-3 h-3 ml-2" />
              </Button>
            </div>

            {isBlocked && (
              <div className="flex items-start gap-3 p-3 bg-red-100 border border-red-200 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">
                    Payment Method Restricted
                  </p>
                  <p className="text-xs text-red-700 mt-0.5">
                    {paymentMethod.blockedReason ||
                      "Please update your payment method to continue accepting appointments."}
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="font-medium text-black">
                  No payment method added
                </p>
                <p className="text-sm text-gray-500 mt-0.5">
                  Add a card to start accepting appointments
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => router.push("/dashboard/payment")}
              className="rounded-full bg-[#F3CFC6] hover:bg-[#e9bfb5] text-gray-800"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Add Card
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
