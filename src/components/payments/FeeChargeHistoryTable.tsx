// src/components/payments/FeeChargeHistoryTable.tsx

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
  CreditCard,
  Filter,
  ChevronDown,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Calendar,
  Ban,
} from "lucide-react";
import { useFeeCharges } from "@/hooks/payments";
import { FeeChargeStatus } from "@/types/payments";
import { cn } from "@/lib/utils";

export function FeeChargeHistoryTable() {
  const [statusFilter, setStatusFilter] = useState<FeeChargeStatus | "all">(
    "all"
  );
  const [expandedCharge, setExpandedCharge] = useState<string | null>(null);

  const { feeCharges, summary, pagination, isLoading, error, loadMore } =
    useFeeCharges({
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

  const getStatusInfo = (status: FeeChargeStatus) => {
    const variants: Record<
      FeeChargeStatus,
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
        label: "Paid",
      },
      failed: {
        icon: <XCircle className="w-3.5 h-3.5" />,
        className:
          "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
        label: "Failed",
      },
      partially_paid: {
        icon: <AlertCircle className="w-3.5 h-3.5" />,
        className:
          "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
        label: "Partial",
      },
      waived: {
        icon: <Ban className="w-3.5 h-3.5" />,
        className:
          "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
        label: "Waived",
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
            <CreditCard className="w-5 h-5 text-[#F3CFC6]" />
            Platform Fee History
          </CardTitle>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#C4C4C4]" />
            <Select
              value={statusFilter}
              onValueChange={(v) =>
                setStatusFilter(v as FeeChargeStatus | "all")
              }
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Paid</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="waived">Waived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary */}
        <div className="flex gap-6 mt-4 text-sm flex-wrap">
          <div>
            <span className="text-[#C4C4C4]">Total Paid: </span>
            <span className="font-medium text-green-600 dark:text-green-400">
              {formatCurrency(summary.totalCharged)}
            </span>
          </div>
          <div>
            <span className="text-[#C4C4C4]">Pending: </span>
            <span className="font-medium text-yellow-600 dark:text-yellow-400">
              {formatCurrency(summary.totalPending)}
            </span>
          </div>
          {summary.totalFailed > 0 && (
            <div>
              <span className="text-[#C4C4C4]">Failed: </span>
              <span className="font-medium text-red-600 dark:text-red-400">
                {formatCurrency(summary.totalFailed)}
              </span>
            </div>
          )}
          {summary.totalWaived > 0 && (
            <div>
              <span className="text-[#C4C4C4]">Waived: </span>
              <span className="font-medium text-purple-600 dark:text-purple-400">
                {formatCurrency(summary.totalWaived)}
              </span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {isLoading && feeCharges.length === 0 ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="w-6 h-6 text-[#F3CFC6] animate-spin" />
          </div>
        ) : feeCharges.length === 0 ? (
          <div className="py-8 text-center">
            <CreditCard className="w-12 h-12 text-[#C4C4C4] mx-auto mb-3" />
            <p className="text-[#C4C4C4]">No fee charges yet</p>
            <p className="text-sm text-[#C4C4C4]/70 mt-1">
              Platform fees will appear here after your sessions are confirmed
            </p>
          </div>
        ) : (
          <>
            {/* Desktop View */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cycle Period</TableHead>
                    <TableHead className="text-right">Sessions</TableHead>
                    <TableHead className="text-right">Gross Earnings</TableHead>
                    <TableHead className="text-right">Platform Fee</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Charged On</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {feeCharges.map((charge, index) => {
                      const statusInfo = getStatusInfo(charge.status);
                      return (
                        <motion.tr
                          key={charge.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="border-b border-[#C4C4C4]/10 hover:bg-[#F3CFC6]/5 cursor-pointer"
                          onClick={() =>
                            setExpandedCharge(
                              expandedCharge === charge.id ? null : charge.id
                            )
                          }
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-[#C4C4C4]" />
                              <span className="font-medium text-black dark:text-white">
                                {formatDateRange(
                                  charge.cycle.startDate,
                                  charge.cycle.endDate
                                )}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-[#C4C4C4]">
                            {charge.earningsCount}
                          </TableCell>
                          <TableCell className="text-right text-black dark:text-white">
                            {formatCurrency(charge.totalGrossEarnings)}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-[#F3CFC6]">
                            {formatCurrency(charge.amountToCharge)}
                            <span className="text-xs text-[#C4C4C4] ml-1">
                              ({charge.platformFeePercent}%)
                            </span>
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
                            {formatDate(charge.chargedAt)}
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
                value={expandedCharge || undefined}
                onValueChange={(v) => setExpandedCharge(v || null)}
              >
                {feeCharges.map((charge, index) => {
                  const statusInfo = getStatusInfo(charge.status);
                  return (
                    <motion.div
                      key={charge.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <AccordionItem value={charge.id} className="border-b-0">
                        <AccordionTrigger className="py-3 px-0 hover:no-underline">
                          <div className="flex items-center justify-between w-full pr-2">
                            <div className="text-left">
                              <p className="font-medium text-black dark:text-white text-sm">
                                {formatDateRange(
                                  charge.cycle.startDate,
                                  charge.cycle.endDate
                                )}
                              </p>
                              <p className="text-xs text-[#C4C4C4]">
                                {charge.earningsCount} session
                                {charge.earningsCount !== 1 ? "s" : ""}
                              </p>
                            </div>
                            <div className="text-right flex items-center gap-2">
                              <span className="font-semibold text-[#F3CFC6]">
                                {formatCurrency(charge.amountToCharge)}
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
                                {formatCurrency(charge.totalGrossEarnings)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#C4C4C4]">
                                Platform Fee ({charge.platformFeePercent}%)
                              </span>
                              <span className="text-[#F3CFC6]">
                                {formatCurrency(charge.amountToCharge)}
                              </span>
                            </div>
                            <div className="flex justify-between pt-2 border-t border-[#C4C4C4]/20">
                              <span className="font-medium text-black dark:text-white">
                                Your Net Earnings
                              </span>
                              <span className="font-semibold text-green-600 dark:text-green-400">
                                {formatCurrency(
                                  charge.totalGrossEarnings -
                                    charge.amountToCharge
                                )}
                              </span>
                            </div>

                            {charge.chargedAt && (
                              <div className="flex justify-between pt-2">
                                <span className="text-[#C4C4C4]">
                                  Charged On
                                </span>
                                <span className="text-black dark:text-white">
                                  {formatDate(charge.chargedAt)}
                                </span>
                              </div>
                            )}

                            {charge.status === "failed" &&
                              charge.failureMessage && (
                                <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-600 dark:text-red-400">
                                  {charge.failureMessage}
                                </div>
                              )}

                            {charge.status === "waived" &&
                              charge.waivedReason && (
                                <div className="mt-2 p-2 bg-purple-50 dark:bg-purple-900/20 rounded text-xs text-purple-600 dark:text-purple-400">
                                  Waived: {charge.waivedReason}
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
