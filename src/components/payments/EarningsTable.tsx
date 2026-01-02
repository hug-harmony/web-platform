// src/components/payments/EarningsTable.tsx

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  DollarSign,
  Clock,
  Calendar,
  Filter,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { useEarnings } from "@/hooks/payments";
import { EarningWithDetails, EarningStatus } from "@/types/payments";
import { cn } from "@/lib/utils";

interface EarningsTableProps {
  earnings?: EarningWithDetails[];
  compact?: boolean;
  showFilters?: boolean;
  showPagination?: boolean;
}

export function EarningsTable({
  earnings: propEarnings,
  compact = false,
  showFilters = false,
  showPagination = true,
}: EarningsTableProps) {
  const [statusFilter, setStatusFilter] = useState<EarningStatus | "all">(
    "all"
  );

  const {
    earnings: fetchedEarnings,
    summary,
    pagination,
    isLoading,
    error,
    loadMore,
  } = useEarnings({
    status: statusFilter === "all" ? undefined : statusFilter,
    limit: compact ? 5 : 10,
    autoFetch: !propEarnings,
  });

  const earnings = propEarnings || fetchedEarnings;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: compact ? undefined : "numeric",
    });
  };

  const formatTime = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const getStatusBadge = (status: EarningStatus) => {
    const variants: Record<
      EarningStatus,
      { className: string; label: string }
    > = {
      pending: {
        className:
          "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
        label: "Pending",
      },
      confirmed: {
        className:
          "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
        label: "Confirmed",
      },
      not_occurred: {
        className:
          "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400",
        label: "Not Occurred",
      },
      disputed: {
        className:
          "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
        label: "Disputed",
      },
      charged: {
        className:
          "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
        label: "Fee Charged",
      },
      waived: {
        className:
          "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
        label: "Fee Waived",
      },
    };

    const variant = variants[status];
    return (
      <Badge variant="secondary" className={cn("text-xs", variant.className)}>
        {variant.label}
      </Badge>
    );
  };

  // Calculate net amount (gross - platform fee)
  const getNetAmount = (earning: EarningWithDetails) => {
    return earning.grossAmount - earning.platformFeeAmount;
  };

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-red-500">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {!compact && (
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-[#F3CFC6]" />
              Earnings History
            </CardTitle>

            {showFilters && (
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#C4C4C4]" />
                <Select
                  value={statusFilter}
                  onValueChange={(v) =>
                    setStatusFilter(v as EarningStatus | "all")
                  }
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="charged">Fee Charged</SelectItem>
                    <SelectItem value="disputed">Disputed</SelectItem>
                    <SelectItem value="not_occurred">Not Occurred</SelectItem>
                    <SelectItem value="waived">Fee Waived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Summary Row */}
          {!compact && summary && (
            <div className="flex gap-6 mt-4 text-sm flex-wrap">
              <div>
                <span className="text-[#C4C4C4]">Gross: </span>
                <span className="font-medium text-black dark:text-white">
                  {formatCurrency(summary.totalGross)}
                </span>
              </div>
              <div>
                <span className="text-[#C4C4C4]">Platform Fees: </span>
                <span className="font-medium text-black dark:text-white">
                  {formatCurrency(summary.totalPlatformFees)}
                </span>
              </div>
              <div>
                <span className="text-[#C4C4C4]">Net: </span>
                <span className="font-medium text-green-600 dark:text-green-400">
                  {formatCurrency(summary.totalNet)}
                </span>
              </div>
            </div>
          )}
        </CardHeader>
      )}

      <CardContent className={compact ? "pt-0" : ""}>
        {isLoading && earnings.length === 0 ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="w-6 h-6 text-[#F3CFC6] animate-spin" />
          </div>
        ) : earnings.length === 0 ? (
          <div className="py-8 text-center text-[#C4C4C4]">
            No earnings found
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead className="text-right">Gross</TableHead>
                    <TableHead className="text-right">Fee</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {earnings.map((earning, index) => (
                      <motion.tr
                        key={earning.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="border-b border-[#C4C4C4]/10 hover:bg-[#F3CFC6]/5"
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage
                                src={earning.client?.profileImage || undefined}
                              />
                              <AvatarFallback className="bg-[#F3CFC6]/20 text-[#F3CFC6] text-xs">
                                {earning.client?.name?.charAt(0) || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-black dark:text-white">
                              {earning.client?.name || "Unknown"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p className="text-black dark:text-white">
                              {formatDate(earning.sessionStartTime)}
                            </p>
                            <p className="text-xs text-[#C4C4C4]">
                              {formatTime(earning.sessionStartTime)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-[#C4C4C4]">
                            <Clock className="w-3 h-3" />
                            <span>
                              {formatDuration(earning.sessionDurationMinutes)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium text-black dark:text-white">
                          {formatCurrency(earning.grossAmount)}
                        </TableCell>
                        <TableCell className="text-right text-[#C4C4C4]">
                          -{formatCurrency(earning.platformFeeAmount)}
                          <span className="text-xs ml-1">
                            ({earning.platformFeePercent}%)
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-medium text-green-600 dark:text-green-400">
                          {formatCurrency(getNetAmount(earning))}
                        </TableCell>
                        <TableCell>{getStatusBadge(earning.status)}</TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              <AnimatePresence>
                {earnings.map((earning, index) => (
                  <motion.div
                    key={earning.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-3 bg-[#F3CFC6]/5 dark:bg-[#C4C4C4]/5 rounded-lg border border-[#F3CFC6]/20 dark:border-[#C4C4C4]/10"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={earning.client?.profileImage || undefined}
                          />
                          <AvatarFallback className="bg-[#F3CFC6]/20 text-[#F3CFC6] text-xs">
                            {earning.client?.name?.charAt(0) || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-black dark:text-white">
                          {earning.client?.name || "Unknown"}
                        </span>
                      </div>
                      {getStatusBadge(earning.status)}
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3 text-[#C4C4C4]">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(earning.sessionStartTime)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDuration(earning.sessionDurationMinutes)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#C4C4C4]/10">
                      <div className="text-xs text-[#C4C4C4]">
                        {formatCurrency(earning.grossAmount)} -{" "}
                        {formatCurrency(earning.platformFeeAmount)} fee
                      </div>
                      <span className="font-semibold text-green-600 dark:text-green-400">
                        {formatCurrency(getNetAmount(earning))}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Load More */}
            {showPagination && pagination.hasMore && (
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
