// src/app/dashboard/payment/components/EarningsSummaryCard.tsx

"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, TrendingUp, Clock, AlertCircle } from "lucide-react";

interface EarningsSummaryCardProps {
  title: string;
  gross: number;
  net: number;
  sessions: number;
  pending?: number;
  variant?: "current" | "lifetime";
}

export function EarningsSummaryCard({
  title,
  gross,
  net,
  sessions,
  pending = 0,
  variant = "current",
}: EarningsSummaryCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const platformFee = gross - net;
  const feePercent = gross > 0 ? ((platformFee / gross) * 100).toFixed(0) : "0";

  return (
    <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
      <Card
        className={`relative overflow-hidden ${
          variant === "current"
            ? "bg-gradient-to-br from-[#F3CFC6] to-[#F3CFC6]/70"
            : "bg-gradient-to-br from-[#C4C4C4]/30 to-[#C4C4C4]/10 dark:from-[#C4C4C4]/20 dark:to-[#C4C4C4]/5"
        }`}
      >
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-24 h-24 transform translate-x-8 -translate-y-8">
          <div
            className={`w-full h-full rounded-full ${
              variant === "current" ? "bg-white/20" : "bg-[#F3CFC6]/20"
            }`}
          />
        </div>

        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <span
              className={`text-sm font-medium ${
                variant === "current"
                  ? "text-black/70"
                  : "text-[#C4C4C4] dark:text-[#C4C4C4]"
              }`}
            >
              {title}
            </span>
            <div
              className={`p-2 rounded-full ${
                variant === "current" ? "bg-white/30" : "bg-[#F3CFC6]/20"
              }`}
            >
              {variant === "current" ? (
                <TrendingUp className="w-4 h-4 text-black/70" />
              ) : (
                <DollarSign className="w-4 h-4 text-[#F3CFC6]" />
              )}
            </div>
          </div>

          {/* Net Earnings (Primary) */}
          <div className="mb-3">
            <p
              className={`text-2xl font-bold ${
                variant === "current"
                  ? "text-black"
                  : "text-black dark:text-white"
              }`}
            >
              {formatCurrency(net)}
            </p>
            <p
              className={`text-xs ${
                variant === "current" ? "text-black/60" : "text-[#C4C4C4]"
              }`}
            >
              Net earnings
            </p>
          </div>

          {/* Details Row */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1">
              <Clock
                className={`w-3 h-3 ${
                  variant === "current" ? "text-black/60" : "text-[#C4C4C4]"
                }`}
              />
              <span
                className={
                  variant === "current" ? "text-black/70" : "text-[#C4C4C4]"
                }
              >
                {sessions} session{sessions !== 1 ? "s" : ""}
              </span>
            </div>
            <span
              className={
                variant === "current" ? "text-black/60" : "text-[#C4C4C4]"
              }
            >
              {feePercent}% platform fee
            </span>
          </div>

          {/* Pending indicator */}
          {pending > 0 && variant === "current" && (
            <div className="mt-3 pt-3 border-t border-black/10">
              <div className="flex items-center gap-1.5 text-xs text-black/70">
                <AlertCircle className="w-3 h-3" />
                <span>
                  {pending} pending confirmation{pending !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          )}

          {/* Gross amount tooltip-style info */}
          <div
            className={`mt-3 pt-3 border-t ${
              variant === "current" ? "border-black/10" : "border-[#C4C4C4]/20"
            }`}
          >
            <div className="flex justify-between text-xs">
              <span
                className={
                  variant === "current" ? "text-black/60" : "text-[#C4C4C4]"
                }
              >
                Gross: {formatCurrency(gross)}
              </span>
              <span
                className={
                  variant === "current" ? "text-black/60" : "text-[#C4C4C4]"
                }
              >
                Fee: {formatCurrency(platformFee)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
