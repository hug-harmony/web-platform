// src/components/edit-profile/PaymentAcceptanceMethodsSection.tsx

"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Wallet, Info } from "lucide-react";
import {
  PAYMENT_ACCEPTANCE_METHODS,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  PaymentAcceptanceMethod,
  groupPaymentMethodsByCategory,
} from "@/lib/constants/payment-acceptance-methods";
import { PaymentAcceptanceIcon } from "@/components/payments/PaymentAcceptanceIcons";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PaymentAcceptanceMethodsSectionProps {
  professionalId: string;
  initialMethods: string[];
  onUpdate?: (methods: string[]) => void;
}

export function PaymentAcceptanceMethodsSection({
  professionalId,
  initialMethods = [],
  onUpdate,
}: PaymentAcceptanceMethodsSectionProps) {
  const [selectedMethods, setSelectedMethods] =
    useState<string[]>(initialMethods);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const groupedMethods = groupPaymentMethodsByCategory();

  const handleToggleMethod = (methodId: string) => {
    setSelectedMethods((prev) => {
      const newMethods = prev.includes(methodId)
        ? prev.filter((m) => m !== methodId)
        : [...prev, methodId];

      setHasChanges(
        JSON.stringify(newMethods.sort()) !==
          JSON.stringify([...initialMethods].sort())
      );

      return newMethods;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const res = await fetch(`/api/professionals/${professionalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentAcceptanceMethods: selectedMethods,
        }),
        credentials: "include",
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to update payment methods");
      }

      toast.success("Payment acceptance methods updated");
      setHasChanges(false);
      onUpdate?.(selectedMethods);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setSelectedMethods(initialMethods);
    setHasChanges(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-[#F3CFC6]" />
          <h3 className="text-lg font-semibold text-black dark:text-white">
            Payment Acceptance Methods
          </h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-[#C4C4C4] cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  Select the payment methods you accept from clients. This helps
                  clients know how they can pay you for your services.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <Card>
        <CardContent className="pt-4 space-y-6">
          {CATEGORY_ORDER.map((category) => {
            const methods = groupedMethods[category];
            if (!methods || methods.length === 0) return null;

            return (
              <div key={category} className="space-y-3">
                <h4 className="text-sm font-medium text-[#C4C4C4] uppercase tracking-wide">
                  {CATEGORY_LABELS[category]}
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {methods.map((method) => {
                    const isSelected = selectedMethods.includes(method.id);

                    return (
                      <label
                        key={method.id}
                        className={`
                          flex items-center gap-3 p-3 rounded-lg border cursor-pointer
                          transition-all duration-200
                          ${
                            isSelected
                              ? "border-[#F3CFC6] bg-[#F3CFC6]/10 dark:bg-[#F3CFC6]/5"
                              : "border-gray-200 dark:border-gray-700 hover:border-[#F3CFC6]/50"
                          }
                        `}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleMethod(method.id)}
                          className="data-[state=checked]:bg-[#F3CFC6] data-[state=checked]:border-[#F3CFC6]"
                        />
                        <PaymentAcceptanceIcon
                          method={method.id as PaymentAcceptanceMethod}
                          size="sm"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-black dark:text-white truncate">
                            {method.name}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Selected Summary */}
          {selectedMethods.length > 0 && (
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-[#C4C4C4] mb-2">
                You accept {selectedMethods.length} payment method
                {selectedMethods.length !== 1 ? "s" : ""}:
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedMethods.map((methodId) => {
                  const method = PAYMENT_ACCEPTANCE_METHODS.find(
                    (m) => m.id === methodId
                  );
                  if (!method) return null;

                  return (
                    <div
                      key={methodId}
                      className="flex items-center gap-2 px-2 py-1 bg-[#F3CFC6]/10 rounded-full"
                    >
                      <PaymentAcceptanceIcon
                        method={methodId as PaymentAcceptanceMethod}
                        size="sm"
                      />
                      <span className="text-xs text-black dark:text-white">
                        {method.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {hasChanges && (
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={isSaving}
                className="rounded-full"
              >
                Reset
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-[#F3CFC6] hover:bg-[#F3CFC6]/80 text-black rounded-full"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
