// src/components/payments/UpcomingEarningsCard.tsx

"use client";

import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Clock, AlertCircle } from "lucide-react";

interface UpcomingEarningsCardProps {
  estimatedNet: number;
  estimatedFee: number;
  sessions: number;
  pendingConfirmations: number;
}

export function UpcomingEarningsCard({
  estimatedNet,
  estimatedFee,
  sessions,
  pendingConfirmations,
}: UpcomingEarningsCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10 border-blue-200/30 dark:border-blue-800/30">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-[#C4C4C4]">
            Estimated Earnings
          </span>
          <div className="p-2 rounded-full bg-blue-200/50 dark:bg-blue-800/30">
            <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
        </div>

        <div className="mb-3">
          <p className="text-2xl font-bold text-black dark:text-white">
            {formatCurrency(estimatedNet)}
          </p>
          <p className="text-xs text-[#C4C4C4]">After platform fees</p>
        </div>

        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-[#C4C4C4]">Platform Fee</span>
            <span className="text-[#F3CFC6]">
              ~{formatCurrency(estimatedFee)}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-[#C4C4C4]">Confirmed Sessions</span>
            <span className="text-black dark:text-white">{sessions}</span>
          </div>

          {pendingConfirmations > 0 && (
            <div className="flex justify-between">
              <span className="text-[#C4C4C4]">Awaiting Confirmation</span>
              <span className="text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {pendingConfirmations}
              </span>
            </div>
          )}
        </div>

        {pendingConfirmations > 0 && (
          <div className="mt-3 p-2 bg-yellow-100/50 dark:bg-yellow-900/20 rounded-md">
            <p className="text-xs text-yellow-700 dark:text-yellow-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Confirm sessions to finalize earnings
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
