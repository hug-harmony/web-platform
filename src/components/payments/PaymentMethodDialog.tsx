// src/components/payments/PaymentMethodDialog.tsx

"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useSetupPaymentMethod } from "@/hooks/payments/usePaymentMethod";
import { CardBrandIcon } from "./CardBrandIcon";

interface PaymentMethodDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  isUpdate?: boolean;
}

export function PaymentMethodDialog({
  open,
  onClose,
  onSuccess,
  isUpdate = false,
}: PaymentMethodDialogProps) {
  const { startSetup, confirmSetup, isLoading, isConfirming, error } =
    useSetupPaymentMethod();

  // Form state for simulated card entry
  // In production, this would be replaced with Stripe Elements
  const [cardNumber, setCardNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvc, setCvc] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [setupStarted, setSetupStarted] = useState(false);

  const resetForm = () => {
    setCardNumber("");
    setExpiryDate("");
    setCvc("");
    setCardholderName("");
    setFormErrors({});
    setSetupStarted(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Format card number with spaces
  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length) {
      return parts.join(" ");
    } else {
      return value;
    }
  };

  // Format expiry date
  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    if (v.length >= 2) {
      return v.substring(0, 2) + "/" + v.substring(2, 4);
    }
    return v;
  };

  // Detect card brand from number
  const detectCardBrand = (number: string): string => {
    const cleanNumber = number.replace(/\s/g, "");
    if (/^4/.test(cleanNumber)) return "visa";
    if (/^5[1-5]/.test(cleanNumber)) return "mastercard";
    if (/^3[47]/.test(cleanNumber)) return "amex";
    if (/^6(?:011|5)/.test(cleanNumber)) return "discover";
    if (/^35/.test(cleanNumber)) return "jcb";
    if (/^3(?:0[0-5]|[68])/.test(cleanNumber)) return "diners";
    if (/^62/.test(cleanNumber)) return "unionpay";
    return "unknown";
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    const cleanCardNumber = cardNumber.replace(/\s/g, "");
    if (!cleanCardNumber) {
      errors.cardNumber = "Card number is required";
    } else if (cleanCardNumber.length < 13 || cleanCardNumber.length > 19) {
      errors.cardNumber = "Invalid card number";
    }

    if (!expiryDate) {
      errors.expiryDate = "Expiry date is required";
    } else {
      const [month, year] = expiryDate.split("/");
      const expMonth = parseInt(month, 10);
      const expYear = parseInt("20" + year, 10);
      const now = new Date();

      if (expMonth < 1 || expMonth > 12) {
        errors.expiryDate = "Invalid month";
      } else if (
        expYear < now.getFullYear() ||
        (expYear === now.getFullYear() && expMonth < now.getMonth() + 1)
      ) {
        errors.expiryDate = "Card has expired";
      }
    }

    if (!cvc) {
      errors.cvc = "CVC is required";
    } else if (cvc.length < 3 || cvc.length > 4) {
      errors.cvc = "Invalid CVC";
    }

    if (!cardholderName.trim()) {
      errors.cardholderName = "Cardholder name is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      // Step 1: Start setup (get setup intent from backend)
      if (!setupStarted) {
        await startSetup();
        setSetupStarted(true);
      }

      // Step 2: Simulate Stripe confirmation
      // In production, you would use Stripe.js to confirm the SetupIntent
      // const stripe = await loadStripe(STRIPE_PUBLISHABLE_KEY);
      // const { setupIntent, error } = await stripe.confirmCardSetup(clientSecret, {
      //   payment_method: {
      //     card: elements.getElement(CardElement),
      //     billing_details: { name: cardholderName },
      //   },
      // });

      // Simulated payment method ID and card details
      const [month, year] = expiryDate.split("/");
      const cleanCardNumber = cardNumber.replace(/\s/g, "");

      const simulatedPaymentMethodId = `pm_simulated_${Date.now()}`;
      const cardDetails = {
        last4: cleanCardNumber.slice(-4),
        brand: detectCardBrand(cardNumber),
        expiryMonth: parseInt(month, 10),
        expiryYear: parseInt("20" + year, 10),
      };

      // Step 3: Confirm with backend
      await confirmSetup(simulatedPaymentMethodId, cardDetails);

      toast.success(
        isUpdate
          ? "Payment method updated successfully"
          : "Payment method added successfully"
      );
      resetForm();
      onSuccess();
    } catch (err) {
      console.error("Payment method error:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to add payment method"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const detectedBrand = detectCardBrand(cardNumber);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CardBrandIcon
              brand={detectedBrand !== "unknown" ? detectedBrand : null}
              size="sm"
            />
            {isUpdate ? "Update Payment Method" : "Add Payment Method"}
          </DialogTitle>
          <DialogDescription>
            {isUpdate
              ? "Enter your new card details to update your payment method."
              : "Add a card for platform fee collection. You'll only be charged at the end of each billing cycle."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Cardholder Name */}
          <div className="space-y-2">
            <Label htmlFor="cardholderName">Cardholder Name</Label>
            <Input
              id="cardholderName"
              placeholder="John Smith"
              value={cardholderName}
              onChange={(e) => setCardholderName(e.target.value)}
              disabled={isSubmitting}
              className={formErrors.cardholderName ? "border-red-500" : ""}
            />
            {formErrors.cardholderName && (
              <p className="text-xs text-red-500">
                {formErrors.cardholderName}
              </p>
            )}
          </div>

          {/* Card Number */}
          <div className="space-y-2">
            <Label htmlFor="cardNumber">Card Number</Label>
            <div className="relative">
              <Input
                id="cardNumber"
                placeholder="4242 4242 4242 4242"
                value={cardNumber}
                onChange={(e) =>
                  setCardNumber(formatCardNumber(e.target.value))
                }
                maxLength={19}
                disabled={isSubmitting}
                className={`${formErrors.cardNumber ? "border-red-500" : ""} pr-12`}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <CardBrandIcon
                  brand={detectedBrand !== "unknown" ? detectedBrand : null}
                  size="sm"
                />
              </div>
            </div>
            {formErrors.cardNumber && (
              <p className="text-xs text-red-500">{formErrors.cardNumber}</p>
            )}
          </div>

          {/* Expiry and CVC */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expiryDate">Expiry Date</Label>
              <Input
                id="expiryDate"
                placeholder="MM/YY"
                value={expiryDate}
                onChange={(e) =>
                  setExpiryDate(formatExpiryDate(e.target.value))
                }
                maxLength={5}
                disabled={isSubmitting}
                className={formErrors.expiryDate ? "border-red-500" : ""}
              />
              {formErrors.expiryDate && (
                <p className="text-xs text-red-500">{formErrors.expiryDate}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="cvc">CVC</Label>
              <Input
                id="cvc"
                placeholder="123"
                value={cvc}
                onChange={(e) =>
                  setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))
                }
                maxLength={4}
                disabled={isSubmitting}
                className={formErrors.cvc ? "border-red-500" : ""}
              />
              {formErrors.cvc && (
                <p className="text-xs text-red-500">{formErrors.cvc}</p>
              )}
            </div>
          </div>

          {/* Accepted Cards */}
          <div className="flex items-center gap-2 py-2">
            <span className="text-xs text-[#C4C4C4]">We accept:</span>
            <div className="flex items-center gap-1">
              <CardBrandIcon brand="visa" size="sm" />
              <CardBrandIcon brand="mastercard" size="sm" />
              <CardBrandIcon brand="amex" size="sm" />
              <CardBrandIcon brand="discover" size="sm" />
            </div>
          </div>

          {/* Security Note */}
          <div className="flex items-center gap-2 text-xs text-[#C4C4C4] bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
            <Lock className="w-4 h-4 shrink-0" />
            <span>
              Your card information is encrypted and securely processed. We
              never store your full card details.
            </span>
          </div>

          {/* Error Display */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isLoading || isConfirming}
              className="bg-[#F3CFC6] hover:bg-[#F3CFC6]/80 text-black"
            >
              {isSubmitting || isLoading || isConfirming ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {isUpdate ? "Update Card" : "Add Card"}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
