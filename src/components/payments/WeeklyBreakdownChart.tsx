// src/app/dashboard/payment/components/WeeklyBreakdownChart.tsx

"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { WeeklyBreakdown } from "@/types/payments";
import { cn } from "@/lib/utils";

interface WeeklyBreakdownChartProps {
  data: WeeklyBreakdown[];
}

export function WeeklyBreakdownChart({ data }: WeeklyBreakdownChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDateRange = (start: Date | string, end: Date | string) => {
    const s = new Date(start);
    const e = new Date(end);
    const options: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
    };
    return `${s.toLocaleDateString("en-US", options)} - ${e.toLocaleDateString("en-US", options)}`;
  };

  // Calculate max for scaling
  const maxNet = Math.max(...data.map((d) => d.netTotal), 1);

  // Calculate trend
  const getTrend = () => {
    if (data.length < 2) return null;
    const current = data[0]?.netTotal ?? 0;
    const previous = data[1]?.netTotal ?? 0;
    if (previous === 0) return null;
    const percentChange = ((current - previous) / previous) * 100;
    return {
      direction:
        percentChange > 0 ? "up" : percentChange < 0 ? "down" : "neutral",
      percent: Math.abs(percentChange).toFixed(0),
    };
  };

  const trend = getTrend();

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#F3CFC6]" />
            Weekly Earnings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center text-[#C4C4C4]">
            No weekly data available yet
          </div>
        </CardContent>
      </Card>
    );
  }

  // Reverse for chronological order (oldest to newest, left to right)
  const chartData = [...data].reverse();

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#F3CFC6]" />
            Weekly Earnings
          </CardTitle>

          {/* Trend Indicator */}
          {trend && (
            <div
              className={cn(
                "flex items-center gap-1 text-sm font-medium",
                trend.direction === "up" &&
                  "text-green-600 dark:text-green-400",
                trend.direction === "down" && "text-red-500 dark:text-red-400",
                trend.direction === "neutral" && "text-[#C4C4C4]"
              )}
            >
              {trend.direction === "up" && <TrendingUp className="w-4 h-4" />}
              {trend.direction === "down" && (
                <TrendingDown className="w-4 h-4" />
              )}
              {trend.direction === "neutral" && <Minus className="w-4 h-4" />}
              <span>{trend.percent}% vs last week</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Chart */}
        <div className="relative h-48 mt-4">
          {/* Grid Lines */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="border-b border-dashed border-[#C4C4C4]/20 w-full"
              />
            ))}
          </div>

          {/* Y-axis Labels */}
          <div className="absolute left-0 top-0 bottom-6 w-12 flex flex-col justify-between text-xs text-[#C4C4C4]">
            <span>{formatCurrency(maxNet)}</span>
            <span>{formatCurrency(maxNet * 0.66)}</span>
            <span>{formatCurrency(maxNet * 0.33)}</span>
            <span>$0</span>
          </div>

          {/* Bars */}
          <div className="absolute left-14 right-0 top-0 bottom-6 flex items-end justify-around gap-2">
            {chartData.map((week, index) => {
              const heightPercent = (week.netTotal / maxNet) * 100;
              const isHovered = hoveredIndex === index;

              return (
                <div
                  key={week.cycleId}
                  className="relative flex-1 flex flex-col items-center"
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  {/* Tooltip */}
                  {isHovered && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute bottom-full mb-2 z-10 bg-black dark:bg-white text-white dark:text-black text-xs rounded-lg p-2 shadow-lg whitespace-nowrap"
                    >
                      <p className="font-semibold">
                        {formatCurrency(week.netTotal)}
                      </p>
                      <p className="text-white/70 dark:text-black/70">
                        {week.sessionsCount} session
                        {week.sessionsCount !== 1 ? "s" : ""}
                      </p>
                      <p className="text-white/70 dark:text-black/70">
                        {formatDateRange(week.startDate, week.endDate)}
                      </p>
                      {/* Arrow */}
                      <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black dark:border-t-white" />
                    </motion.div>
                  )}

                  {/* Bar */}
                  <motion.div
                    className={cn(
                      "w-full max-w-12 rounded-t-md transition-colors cursor-pointer",
                      isHovered
                        ? "bg-[#F3CFC6]"
                        : "bg-[#F3CFC6]/60 dark:bg-[#F3CFC6]/40"
                    )}
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(heightPercent, 2)}%` }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  />
                </div>
              );
            })}
          </div>

          {/* X-axis Labels */}
          <div className="absolute left-14 right-0 bottom-0 h-6 flex justify-around text-xs text-[#C4C4C4]">
            {chartData.map((week) => (
              <div key={week.cycleId} className="text-center">
                W{week.weekNumber}
              </div>
            ))}
          </div>
        </div>

        {/* Summary Row */}
        <div className="mt-6 pt-4 border-t border-[#C4C4C4]/20 grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-black dark:text-white">
              {formatCurrency(data.reduce((sum, w) => sum + w.netTotal, 0))}
            </p>
            <p className="text-xs text-[#C4C4C4]">
              Total ({data.length} weeks)
            </p>
          </div>
          <div>
            <p className="text-2xl font-bold text-black dark:text-white">
              {formatCurrency(
                data.reduce((sum, w) => sum + w.netTotal, 0) / data.length
              )}
            </p>
            <p className="text-xs text-[#C4C4C4]">Avg per week</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-black dark:text-white">
              {data.reduce((sum, w) => sum + w.sessionsCount, 0)}
            </p>
            <p className="text-xs text-[#C4C4C4]">Total sessions</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
