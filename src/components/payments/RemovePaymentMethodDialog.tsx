// src/components/payments/RemovePaymentMethodDialog.tsx

"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRemovePaymentMethod } from "@/hooks/payments/usePaymentMethod";
import { CardBrandIcon } from "./CardBrandIcon";

interface RemovePaymentMethodDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  cardLast4?: string | null;
  cardBrand?: string | null;
}

export function RemovePaymentMethodDialog({
  open,
  onClose,
  onSuccess,
  cardLast4,
  cardBrand,
}: RemovePaymentMethodDialogProps) {
  const { remove, isRemoving, error } = useRemovePaymentMethod();
  const [localError, setLocalError] = useState<string | null>(null);

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

  const handleRemove = async () => {
    setLocalError(null);

    try {
      await remove();
      toast.success("Payment method removed successfully");
      onSuccess();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to remove payment method";
      setLocalError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleClose = () => {
    setLocalError(null);
    onClose();
  };

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Remove Payment Method
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>Are you sure you want to remove this payment method?</p>

              {cardLast4 && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <CardBrandIcon brand={cardBrand} size="md" />
                  <span className="font-medium text-black dark:text-white">
                    {formatCardBrand(cardBrand)} •••• {cardLast4}
                  </span>
                </div>
              )}

              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  <strong>Warning:</strong> Without a payment method, you
                  won&apos;t be able to accept new appointments until you add
                  one. Any pending fees will still need to be paid.
                </p>
              </div>

              {(error || localError) && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {error || localError}
                  </p>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isRemoving}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleRemove}
            disabled={isRemoving}
          >
            {isRemoving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Removing...
              </>
            ) : (
              "Remove Payment Method"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
