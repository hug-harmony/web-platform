// src/components/payments/PaymentMethodCard.tsx

"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Plus, Check, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaymentMethodCardProps {
  hasPaymentMethod: boolean;
  cardLast4?: string | null;
  cardBrand?: string | null;
  isBlocked?: boolean;
  onUpdate?: () => void;
}

export function PaymentMethodCard({
  hasPaymentMethod,
  cardLast4,
  cardBrand,
  isBlocked = false,
  onUpdate,
}: PaymentMethodCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleAddCard = async () => {
    setIsUpdating(true);
    // TODO: Integrate with Stripe Elements for card setup
    // This would open a modal or redirect to setup flow
    try {
      // Placeholder for Stripe setup
      await new Promise((resolve) => setTimeout(resolve, 1000));
      onUpdate?.();
    } finally {
      setIsUpdating(false);
    }
  };

  const formatCardBrand = (brand: string | null | undefined) => {
    if (!brand) return "Card";
    return brand.charAt(0).toUpperCase() + brand.slice(1);
  };

  return (
    <Card className={cn(isBlocked && "border-red-300 dark:border-red-800")}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#F3CFC6]" />
            Payment Method
          </CardTitle>
          {hasPaymentMethod && !isBlocked && (
            <Badge
              variant="secondary"
              className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
            >
              <Check className="w-3 h-3 mr-1" />
              Active
            </Badge>
          )}
          {isBlocked && (
            <Badge
              variant="secondary"
              className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
            >
              <AlertTriangle className="w-3 h-3 mr-1" />
              Action Required
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {hasPaymentMethod ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#F3CFC6]/20 rounded-lg">
                <CreditCard className="w-6 h-6 text-[#F3CFC6]" />
              </div>
              <div>
                <p className="font-medium text-black dark:text-white">
                  {formatCardBrand(cardBrand)} •••• {cardLast4}
                </p>
                <p className="text-xs text-[#C4C4C4]">
                  Used for platform fee collection
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddCard}
                disabled={isUpdating}
                className="border-[#F3CFC6] text-[#F3CFC6] hover:bg-[#F3CFC6]/10"
              >
                {isUpdating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Update"
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <div className="p-3 bg-[#F3CFC6]/10 rounded-full w-fit mx-auto mb-3">
              <CreditCard className="w-8 h-8 text-[#C4C4C4]" />
            </div>
            <p className="text-sm text-[#C4C4C4] mb-4">
              Add a payment method for platform fee collection
            </p>
            <Button
              onClick={handleAddCard}
              disabled={isUpdating}
              className="bg-[#F3CFC6] hover:bg-[#F3CFC6]/80 text-black"
            >
              {isUpdating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Add Payment Method
            </Button>
          </div>
        )}

        {isBlocked && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-400">
              Your account is restricted. Please update your payment method to
              continue accepting appointments.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
