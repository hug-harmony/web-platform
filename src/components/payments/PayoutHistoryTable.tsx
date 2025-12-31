// src/app/dashboard/payment/components/PayoutHistoryTable.tsx

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Wallet,
  Filter,
  ChevronDown,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Calendar,
} from "lucide-react";
import { usePayouts, usePayout } from "@/hooks/payments";
import { PayoutStatus, PayoutHistoryItem } from "@/types/payments";
import { cn } from "@/lib/utils";

export function PayoutHistoryTable() {
  const [statusFilter, setStatusFilter] = useState<PayoutStatus | "all">("all");
  const [expandedPayout, setExpandedPayout] = useState<string | null>(null);

  const { payouts, summary, pagination, isLoading, error, loadMore } =
    usePayouts({
      status: statusFilter === "all" ? undefined : statusFilter,
    });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDateRange = (start: Date | string, end: Date | string) => {
    const s = new Date(start);
    const e = new Date(end);
    const options: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
    };
    return `${s.toLocaleDateString("en-US", options)} - ${e.toLocaleDateString("en-US", { ...options, year: "numeric" })}`;
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "—";
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusInfo = (status: PayoutStatus) => {
    const variants: Record<
      PayoutStatus,
      { icon: React.ReactNode; className: string; label: string }
    > = {
      pending: {
        icon: <Clock className="w-3.5 h-3.5" />,
        className:
          "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
        label: "Pending",
      },
      processing: {
        icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
        className:
          "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
        label: "Processing",
      },
      completed: {
        icon: <CheckCircle2 className="w-3.5 h-3.5" />,
        className:
          "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
        label: "Completed",
      },
      failed: {
        icon: <XCircle className="w-3.5 h-3.5" />,
        className:
          "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
        label: "Failed",
      },
    };

    return variants[status];
  };

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-500">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-[#F3CFC6]" />
            Payout History
          </CardTitle>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#C4C4C4]" />
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as PayoutStatus | "all")}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary */}
        <div className="flex gap-6 mt-4 text-sm">
          <div>
            <span className="text-[#C4C4C4]">Total Paid: </span>
            <span className="font-medium text-green-600 dark:text-green-400">
              {formatCurrency(summary.totalPaid)}
            </span>
          </div>
          <div>
            <span className="text-[#C4C4C4]">Pending: </span>
            <span className="font-medium text-yellow-600 dark:text-yellow-400">
              {formatCurrency(summary.totalPending)}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading && payouts.length === 0 ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="w-6 h-6 text-[#F3CFC6] animate-spin" />
          </div>
        ) : payouts.length === 0 ? (
          <div className="py-8 text-center">
            <Wallet className="w-12 h-12 text-[#C4C4C4] mx-auto mb-3" />
            <p className="text-[#C4C4C4]">No payouts yet</p>
            <p className="text-sm text-[#C4C4C4]/70 mt-1">
              Complete sessions to receive your first payout
            </p>
          </div>
        ) : (
          <>
            {/* Desktop View */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Sessions</TableHead>
                    <TableHead className="text-right">Gross</TableHead>
                    <TableHead className="text-right">Fees</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Paid On</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {payouts.map((payout, index) => {
                      const statusInfo = getStatusInfo(payout.status);
                      return (
                        <motion.tr
                          key={payout.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="border-b border-[#C4C4C4]/10 hover:bg-[#F3CFC6]/5 cursor-pointer"
                          onClick={() =>
                            setExpandedPayout(
                              expandedPayout === payout.id ? null : payout.id
                            )
                          }
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-[#C4C4C4]" />
                              <span className="font-medium text-black dark:text-white">
                                {formatDateRange(
                                  payout.cycleStartDate,
                                  payout.cycleEndDate
                                )}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-[#C4C4C4]">
                            {payout.earningsCount}
                          </TableCell>
                          <TableCell className="text-right text-black dark:text-white">
                            {formatCurrency(payout.grossTotal)}
                          </TableCell>
                          <TableCell className="text-right text-[#C4C4C4]">
                            {formatCurrency(payout.platformFeeTotal)}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-green-600 dark:text-green-400">
                            {formatCurrency(payout.netTotal)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={cn(
                                "flex items-center gap-1 w-fit",
                                statusInfo.className
                              )}
                            >
                              {statusInfo.icon}
                              {statusInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-[#C4C4C4]">
                            {formatDate(payout.processedAt)}
                          </TableCell>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>

            {/* Mobile View */}
            <div className="md:hidden">
              <Accordion
                type="single"
                collapsible
                value={expandedPayout || undefined}
                onValueChange={(v) => setExpandedPayout(v || null)}
              >
                {payouts.map((payout, index) => {
                  const statusInfo = getStatusInfo(payout.status);
                  return (
                    <motion.div
                      key={payout.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <AccordionItem value={payout.id} className="border-b-0">
                        <AccordionTrigger className="py-3 px-0 hover:no-underline">
                          <div className="flex items-center justify-between w-full pr-2">
                            <div className="text-left">
                              <p className="font-medium text-black dark:text-white text-sm">
                                {formatDateRange(
                                  payout.cycleStartDate,
                                  payout.cycleEndDate
                                )}
                              </p>
                              <p className="text-xs text-[#C4C4C4]">
                                {payout.earningsCount} session
                                {payout.earningsCount !== 1 ? "s" : ""}
                              </p>
                            </div>
                            <div className="text-right flex items-center gap-2">
                              <span className="font-semibold text-green-600 dark:text-green-400">
                                {formatCurrency(payout.netTotal)}
                              </span>
                              <Badge
                                variant="secondary"
                                className={cn("text-xs", statusInfo.className)}
                              >
                                {statusInfo.label}
                              </Badge>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="py-2 space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-[#C4C4C4]">
                                Gross Earnings
                              </span>
                              <span className="text-black dark:text-white">
                                {formatCurrency(payout.grossTotal)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#C4C4C4]">
                                Platform Fees
                              </span>
                              <span className="text-black dark:text-white">
                                -{formatCurrency(payout.platformFeeTotal)}
                              </span>
                            </div>
                            <div className="flex justify-between pt-2 border-t border-[#C4C4C4]/20">
                              <span className="font-medium text-black dark:text-white">
                                Net Payout
                              </span>
                              <span className="font-semibold text-green-600 dark:text-green-400">
                                {formatCurrency(payout.netTotal)}
                              </span>
                            </div>

                            {payout.processedAt && (
                              <div className="flex justify-between pt-2">
                                <span className="text-[#C4C4C4]">Paid On</span>
                                <span className="text-black dark:text-white">
                                  {formatDate(payout.processedAt)}
                                </span>
                              </div>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </motion.div>
                  );
                })}
              </Accordion>
            </div>

            {/* Load More */}
            {pagination.hasMore && (
              <div className="mt-4 text-center">
                <Button
                  variant="outline"
                  onClick={loadMore}
                  disabled={isLoading}
                  className="border-[#F3CFC6] text-[#F3CFC6] hover:bg-[#F3CFC6]/10"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <ChevronDown className="w-4 h-4 mr-2" />
                  )}
                  Load More
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
