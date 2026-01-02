// src/components/payments/PendingFeesCard.tsx

"use client";

import { Card, CardContent } from "@/components/ui/card";
import { CreditCard, AlertTriangle } from "lucide-react";
import Link from "next/link";

interface PendingFeesCardProps {
  amount: number;
  cycleCount: number;
}

export function PendingFeesCard({ amount, cycleCount }: PendingFeesCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  return (
    <Card className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/10 border-red-200/30 dark:border-red-800/30">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-red-700 dark:text-red-400">
            Outstanding Fees
          </span>
          <div className="p-2 rounded-full bg-red-200/50 dark:bg-red-800/30">
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
          </div>
        </div>

        <div className="mb-3">
          <p className="text-2xl font-bold text-red-700 dark:text-red-400">
            {formatCurrency(amount)}
          </p>
          <p className="text-xs text-red-600/70 dark:text-red-400/70">
            {cycleCount} cycle{cycleCount !== 1 ? "s" : ""} pending
          </p>
        </div>

        <div className="p-2 bg-red-100/50 dark:bg-red-900/30 rounded-md">
          <p className="text-xs text-red-700 dark:text-red-400">
            Please ensure your payment method is up to date to avoid account
            restrictions.
          </p>
        </div>

        <Link
          href="/dashboard/payment/settings"
          className="mt-3 flex items-center justify-center gap-2 w-full py-2 px-3 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors"
        >
          <CreditCard className="w-4 h-4" />
          Update Payment Method
        </Link>
      </CardContent>
    </Card>
  );
}
