// src/app/dashboard/payment/components/UpcomingPayoutCard.tsx

"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Wallet, ArrowRight, AlertTriangle } from "lucide-react";

interface UpcomingPayoutCardProps {
  amount: number;
  date: string | null;
  sessions: number;
  pendingConfirmations: number;
}

export function UpcomingPayoutCard({
  amount,
  date,
  sessions,
  pendingConfirmations,
}: UpcomingPayoutCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "TBD";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const hasAmount = amount > 0;
  const hasPending = pendingConfirmations > 0;

  return (
    <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
      <Card
        className={`relative overflow-hidden ${
          hasAmount
            ? "bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/10 border-green-200 dark:border-green-800/30"
            : "bg-white dark:bg-gray-800 border border-[#C4C4C4]/20"
        }`}
      >
        {hasAmount && (
          <div className="absolute top-0 right-0 w-20 h-20 transform translate-x-6 -translate-y-6">
            <div className="w-full h-full rounded-full bg-green-200/30 dark:bg-green-500/10" />
          </div>
        )}

        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <span
              className={`text-sm font-medium ${
                hasAmount
                  ? "text-green-700 dark:text-green-400"
                  : "text-[#C4C4C4]"
              }`}
            >
              Upcoming Payout
            </span>
            <div
              className={`p-2 rounded-full ${
                hasAmount
                  ? "bg-green-200/50 dark:bg-green-500/20"
                  : "bg-[#C4C4C4]/10"
              }`}
            >
              <Wallet
                className={`w-4 h-4 ${
                  hasAmount
                    ? "text-green-600 dark:text-green-400"
                    : "text-[#C4C4C4]"
                }`}
              />
            </div>
          </div>

          {/* Amount */}
          <div className="mb-3">
            <p
              className={`text-2xl font-bold ${
                hasAmount
                  ? "text-green-700 dark:text-green-400"
                  : "text-[#C4C4C4]"
              }`}
            >
              {formatCurrency(amount)}
            </p>
            <p
              className={`text-xs ${
                hasAmount
                  ? "text-green-600/70 dark:text-green-400/70"
                  : "text-[#C4C4C4]"
              }`}
            >
              Estimated payout
            </p>
          </div>

          {/* Payout Date */}
          {hasAmount && (
            <div className="flex items-center gap-2 text-sm">
              <ArrowRight className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
              <span className="text-green-700 dark:text-green-300">
                {formatDate(date)}
              </span>
              <span className="text-green-600/60 dark:text-green-400/60">
                • {sessions} session{sessions !== 1 ? "s" : ""}
              </span>
            </div>
          )}

          {/* No earnings yet */}
          {!hasAmount && (
            <p className="text-sm text-[#C4C4C4]">
              Complete sessions to see your estimated payout
            </p>
          )}

          {/* Pending confirmations warning */}
          {hasPending && (
            <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-800/30">
              <div className="flex items-center gap-1.5 text-xs text-yellow-600 dark:text-yellow-400">
                <AlertTriangle className="w-3 h-3" />
                <span>
                  {pendingConfirmations} session
                  {pendingConfirmations !== 1 ? "s" : ""} awaiting confirmation
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
