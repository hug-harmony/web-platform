// src/components/payments/PaymentMethodCard.tsx

"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  Plus,
  Check,
  AlertTriangle,
  Trash2,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PaymentMethodDialog } from "./PaymentMethodDialog";
import { RemovePaymentMethodDialog } from "./RemovePaymentMethodDialog";
import { CardBrandIcon } from "./CardBrandIcon";

interface PaymentMethodCardProps {
  hasPaymentMethod: boolean;
  cardLast4?: string | null;
  cardBrand?: string | null;
  cardExpiryMonth?: number | null;
  cardExpiryYear?: number | null;
  addedAt?: Date | string | null;
  isBlocked?: boolean;
  blockedReason?: string | null;
  onUpdate?: () => void;
}

export function PaymentMethodCard({
  hasPaymentMethod,
  cardLast4,
  cardBrand,
  cardExpiryMonth,
  cardExpiryYear,
  isBlocked = false,
  blockedReason,
  onUpdate,
}: PaymentMethodCardProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);

  const formatCardBrand = (brand: string | null | undefined) => {
    if (!brand) return "Card";
    const brandMap: Record<string, string> = {
      visa: "Visa",
      mastercard: "Mastercard",
      amex: "American Express",
      discover: "Discover",
      diners: "Diners Club",
      jcb: "JCB",
      unionpay: "UnionPay",
    };
    return (
      brandMap[brand.toLowerCase()] ||
      brand.charAt(0).toUpperCase() + brand.slice(1)
    );
  };

  const formatExpiry = () => {
    if (!cardExpiryMonth || !cardExpiryYear) return null;
    return `${String(cardExpiryMonth).padStart(2, "0")}/${String(cardExpiryYear).slice(-2)}`;
  };

  const isExpiringSoon = () => {
    if (!cardExpiryMonth || !cardExpiryYear) return false;
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Check if expiring this month or next month
    if (cardExpiryYear < currentYear) return true;
    if (cardExpiryYear === currentYear && cardExpiryMonth <= currentMonth + 1)
      return true;
    return false;
  };

  const handleSuccess = () => {
    setShowAddDialog(false);
    setShowRemoveDialog(false);
    onUpdate?.();
  };

  return (
    <>
      <Card className={cn(isBlocked && "border-red-300 dark:border-red-800")}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#F3CFC6]" />
              Payment Method
            </CardTitle>
            {hasPaymentMethod && !isBlocked && !isExpiringSoon() && (
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
            {!isBlocked && hasPaymentMethod && isExpiringSoon() && (
              <Badge
                variant="secondary"
                className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
              >
                <AlertTriangle className="w-3 h-3 mr-1" />
                Expiring Soon
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {hasPaymentMethod ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#F3CFC6]/10 rounded-lg border border-[#F3CFC6]/20">
                    <CardBrandIcon brand={cardBrand} size="md" />
                  </div>
                  <div>
                    <p className="font-medium text-black dark:text-white">
                      {formatCardBrand(cardBrand)} •••• {cardLast4}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-[#C4C4C4]">
                      {formatExpiry() && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Expires {formatExpiry()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddDialog(true)}
                    className="border-[#F3CFC6] text-[#F3CFC6] hover:bg-[#F3CFC6]/10"
                  >
                    Update
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowRemoveDialog(true)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {isExpiringSoon() && !isBlocked && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    Your card is expiring soon. Please update your payment
                    method to avoid service interruption.
                  </p>
                </div>
              )}

              <p className="text-xs text-[#C4C4C4]">
                This card will be charged for platform fees at the end of each
                billing cycle.
              </p>
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="p-3 bg-[#F3CFC6]/10 rounded-full w-fit mx-auto mb-3">
                <CreditCard className="w-8 h-8 text-[#C4C4C4]" />
              </div>
              <p className="text-sm text-[#C4C4C4] mb-1">
                No payment method on file
              </p>
              <p className="text-xs text-[#C4C4C4] mb-4">
                Add a card for platform fee collection at the end of each
                billing cycle
              </p>
              <Button
                onClick={() => setShowAddDialog(true)}
                className="bg-[#F3CFC6] hover:bg-[#F3CFC6]/80 text-black"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Payment Method
              </Button>
            </div>
          )}

          {isBlocked && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-700 dark:text-red-400">
                    Account Restricted
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    {blockedReason ||
                      "Your account is restricted due to payment issues. Please update your payment method to continue accepting appointments."}
                  </p>
                  <Button
                    size="sm"
                    onClick={() => setShowAddDialog(true)}
                    className="mt-3 bg-red-600 hover:bg-red-700 text-white"
                  >
                    Update Payment Method Now
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Update Payment Method Dialog */}
      <PaymentMethodDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onSuccess={handleSuccess}
        isUpdate={hasPaymentMethod}
      />

      {/* Remove Payment Method Dialog */}
      <RemovePaymentMethodDialog
        open={showRemoveDialog}
        onClose={() => setShowRemoveDialog(false)}
        onSuccess={handleSuccess}
        cardLast4={cardLast4}
        cardBrand={cardBrand}
      />
    </>
  );
}
