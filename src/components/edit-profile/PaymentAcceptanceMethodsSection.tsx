"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Loader2,
  Wallet,
  Info,
  Save,
  RotateCcw,
  CheckCircle,
} from "lucide-react";
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

  const hasChanges = useMemo(() => {
    return (
      JSON.stringify([...selectedMethods].sort()) !==
      JSON.stringify([...initialMethods].sort())
    );
  }, [selectedMethods, initialMethods]);

  const groupedMethods = groupPaymentMethodsByCategory();

  const handleToggleMethod = (methodId: string) => {
    setSelectedMethods((prev) =>
      prev.includes(methodId)
        ? prev.filter((m) => m !== methodId)
        : [...prev, methodId]
    );
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

      toast.success("Payment methods updated successfully");
      onUpdate?.(selectedMethods);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setSelectedMethods(initialMethods);
  };

  return (
    <Card className="border-gray-200 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <Wallet className="h-5 w-5 text-[#F3CFC6]" />
            Payment Acceptance Methods
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-gray-400 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>
                    Select the payment methods you accept from clients. This
                    helps clients know how they can pay for your services.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>

          {selectedMethods.length > 0 && (
            <Badge
              variant="secondary"
              className="bg-[#F3CFC6]/20 text-gray-700"
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              {selectedMethods.length} selected
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {CATEGORY_ORDER.map((category) => {
          const methods = groupedMethods[category];
          if (!methods || methods.length === 0) return null;

          return (
            <div key={category} className="space-y-3">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {CATEGORY_LABELS[category]}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {methods.map((method) => {
                  const isSelected = selectedMethods.includes(method.id);

                  return (
                    <label
                      key={method.id}
                      className={`
                        flex items-center gap-3 p-3 rounded-lg border cursor-pointer
                        transition-all duration-200 group
                        ${
                          isSelected
                            ? "border-[#F3CFC6] bg-[#F3CFC6]/10 shadow-sm"
                            : "border-gray-200 hover:border-[#F3CFC6]/50 hover:bg-gray-50"
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
                      <span
                        className={`text-sm font-medium truncate ${
                          isSelected ? "text-black" : "text-gray-700"
                        }`}
                      >
                        {method.name}
                      </span>
                      {isSelected && (
                        <CheckCircle className="h-4 w-4 text-green-500 ml-auto flex-shrink-0" />
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Selected Summary */}
        {selectedMethods.length > 0 && (
          <div className="pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-500 mb-3">
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
                  <Badge
                    key={methodId}
                    variant="secondary"
                    className="bg-[#F3CFC6]/20 text-gray-700 px-3 py-1"
                  >
                    <PaymentAcceptanceIcon
                      method={methodId as PaymentAcceptanceMethod}
                      size="sm"
                    />
                    <span className="ml-2">{method.name}</span>
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {hasChanges && (
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={isSaving}
              className="rounded-full"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-full bg-[#F3CFC6] hover:bg-[#e9bfb5] text-gray-800 min-w-[120px]"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
