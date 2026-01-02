// src/components/payments/MonthlyBreakdownTable.tsx

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CalendarDays } from "lucide-react";
import { MonthlyBreakdown } from "@/types/payments";

interface MonthlyBreakdownTableProps {
  data: MonthlyBreakdown[];
}

export function MonthlyBreakdownTable({ data }: MonthlyBreakdownTableProps) {
  // Get available years from data
  const years = [...new Set(data.map((d) => d.year))].sort((a, b) => b - a);
  const [selectedYear, setSelectedYear] = useState<number | "all">("all");

  const filteredData =
    selectedYear === "all" ? data : data.filter((d) => d.year === selectedYear);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  // Calculate totals
  const totals = filteredData.reduce(
    (acc, month) => ({
      gross: acc.gross + month.grossTotal,
      fees: acc.fees + month.platformFeeTotal,
      net: acc.net + month.netTotal,
      sessions: acc.sessions + month.sessionsCount,
      cycles: acc.cycles + month.cyclesCount,
    }),
    { gross: 0, fees: 0, net: 0, sessions: 0, cycles: 0 }
  );

  if (data.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-[#F3CFC6]" />
            Monthly Summary
          </CardTitle>

          {years.length > 1 && (
            <Select
              value={String(selectedYear)}
              onValueChange={(v) =>
                setSelectedYear(v === "all" ? "all" : Number(v))
              }
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {years.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Cycles</TableHead>
                <TableHead className="text-right">Sessions</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">Fees</TableHead>
                <TableHead className="text-right">Net</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence>
                {filteredData.map((month, index) => (
                  <motion.tr
                    key={`${month.year}-${month.month}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b border-[#C4C4C4]/10 hover:bg-[#F3CFC6]/5"
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor: `hsl(${(month.month - 1) * 30}, 70%, 70%)`,
                          }}
                        />
                        <span className="font-medium text-black dark:text-white">
                          {month.monthName} {month.year}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-[#C4C4C4]">
                      {month.cyclesCount}
                    </TableCell>
                    <TableCell className="text-right text-[#C4C4C4]">
                      {month.sessionsCount}
                    </TableCell>
                    <TableCell className="text-right text-black dark:text-white">
                      {formatCurrency(month.grossTotal)}
                    </TableCell>
                    <TableCell className="text-right text-[#C4C4C4]">
                      {formatCurrency(month.platformFeeTotal)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-green-600 dark:text-green-400">
                      {formatCurrency(month.netTotal)}
                    </TableCell>
                  </motion.tr>
                ))}
              </AnimatePresence>

              {/* Totals Row */}
              <TableRow className="bg-[#F3CFC6]/10 dark:bg-[#C4C4C4]/5 font-semibold">
                <TableCell className="text-black dark:text-white">
                  Total
                </TableCell>
                <TableCell className="text-right text-[#C4C4C4]">
                  {totals.cycles}
                </TableCell>
                <TableCell className="text-right text-black dark:text-white">
                  {totals.sessions}
                </TableCell>
                <TableCell className="text-right text-black dark:text-white">
                  {formatCurrency(totals.gross)}
                </TableCell>
                <TableCell className="text-right text-[#C4C4C4]">
                  {formatCurrency(totals.fees)}
                </TableCell>
                <TableCell className="text-right text-green-600 dark:text-green-400">
                  {formatCurrency(totals.net)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden space-y-3">
          {filteredData.map((month, index) => (
            <motion.div
              key={`${month.year}-${month.month}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="p-4 bg-[#F3CFC6]/5 dark:bg-[#C4C4C4]/5 rounded-lg border border-[#F3CFC6]/20 dark:border-[#C4C4C4]/10"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: `hsl(${(month.month - 1) * 30}, 70%, 70%)`,
                    }}
                  />
                  <span className="font-semibold text-black dark:text-white">
                    {month.monthName} {month.year}
                  </span>
                </div>
                <span className="font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(month.netTotal)}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-sm text-center">
                <div className="p-2 bg-white dark:bg-gray-800 rounded">
                  <p className="text-[#C4C4C4] text-xs">Sessions</p>
                  <p className="font-medium text-black dark:text-white">
                    {month.sessionsCount}
                  </p>
                </div>
                <div className="p-2 bg-white dark:bg-gray-800 rounded">
                  <p className="text-[#C4C4C4] text-xs">Gross</p>
                  <p className="font-medium text-black dark:text-white">
                    {formatCurrency(month.grossTotal)}
                  </p>
                </div>
                <div className="p-2 bg-white dark:bg-gray-800 rounded">
                  <p className="text-[#C4C4C4] text-xs">Fees</p>
                  <p className="font-medium text-black dark:text-white">
                    {formatCurrency(month.platformFeeTotal)}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}

          {/* Mobile Totals */}
          <div className="p-4 bg-[#F3CFC6]/20 dark:bg-[#F3CFC6]/10 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-black dark:text-white">
                Total
              </span>
              <span className="font-bold text-green-600 dark:text-green-400">
                {formatCurrency(totals.net)}
              </span>
            </div>
            <div className="flex justify-between text-sm text-[#C4C4C4]">
              <span>{totals.sessions} sessions</span>
              <span>Gross: {formatCurrency(totals.gross)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
