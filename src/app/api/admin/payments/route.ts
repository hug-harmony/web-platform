// src/app/api/admin/payments/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getAllCyclesWithStats,
  getDisputedConfirmations,
  getFeeChargeSummaryForAdmin,
  getCycleWithStats,
  getBlockedProfessionals,
  getConfirmationStatsForCycle,
} from "@/lib/services/payments";
import { getHistoricalStats } from "@/lib/services/payments/historicalStats";
import { CycleStatus } from "@/types/payments";
import { z } from "zod";

const querySchema = z.object({
  view: z
    .enum(["overview", "cycles", "disputes", "blocked"])
    .optional()
    .default("overview"),
  cycleId: z.string().optional(),
  status: z
    .enum(["active", "confirming", "processing", "completed", "failed"])
    .optional(),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(50).optional().default(10),
  includeHistory: z.coerce.boolean().optional().default(false),
  dateFilter: z
    .enum([
      "thisMonth",
      "lastMonth",
      "last3months",
      "last6months",
      "thisYear",
      "lastYear",
      "allTime",
      "custom",
    ])
    .optional()
    .default("last6months"),
  year: z.coerce.number().optional(),
  month: z.coerce.number().min(1).max(12).optional(),
});

// Helper function to calculate date range
function getDateRangeFromFilter(
  filter: string,
  year?: number,
  month?: number
): { startDate: Date; endDate: Date } {
  const now = new Date();
  const endDate = new Date();

  switch (filter) {
    case "thisMonth":
      return {
        startDate: new Date(now.getFullYear(), now.getMonth(), 1),
        endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0),
      };

    case "lastMonth":
      return {
        startDate: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        endDate: new Date(now.getFullYear(), now.getMonth(), 0),
      };

    case "last3months":
      return {
        startDate: new Date(now.getFullYear(), now.getMonth() - 3, 1),
        endDate,
      };

    case "last6months":
      return {
        startDate: new Date(now.getFullYear(), now.getMonth() - 6, 1),
        endDate,
      };

    case "thisYear":
      return {
        startDate: new Date(now.getFullYear(), 0, 1),
        endDate,
      };

    case "lastYear":
      return {
        startDate: new Date(now.getFullYear() - 1, 0, 1),
        endDate: new Date(now.getFullYear() - 1, 11, 31),
      };

    case "custom":
      if (year && month) {
        return {
          startDate: new Date(year, month - 1, 1),
          endDate: new Date(year, month, 0),
        };
      }
      if (year) {
        return {
          startDate: new Date(year, 0, 1),
          endDate: new Date(year, 11, 31),
        };
      }
    // Fall through to allTime

    case "allTime":
    default:
      return {
        startDate: new Date(2020, 0, 1), // Reasonable start date
        endDate,
      };
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session.user.isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized: Admin access required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const params = querySchema.parse({
      view: searchParams.get("view") || "overview",
      cycleId: searchParams.get("cycleId") || undefined,
      status: searchParams.get("status") || undefined,
      page: searchParams.get("page") || 1,
      limit: searchParams.get("limit") || 10,
      includeHistory: searchParams.get("includeHistory") === "true",
      dateFilter: searchParams.get("dateFilter") || "last6months",
      year: searchParams.get("year") || undefined,
      month: searchParams.get("month") || undefined,
    });

    // Calculate date range based on filter
    const dateRange = getDateRangeFromFilter(
      params.dateFilter,
      params.year,
      params.month
    );

    switch (params.view) {
      case "overview": {
        const [allCyclesResult, disputes, feeChargeSummary, blockedPros] =
          await Promise.all([
            getAllCyclesWithStats({
              limit: 20,
              status: params.status as CycleStatus | undefined,
            }),
            getDisputedConfirmations(),
            getFeeChargeSummaryForAdmin(params.cycleId),
            getBlockedProfessionals(),
          ]);

        // Filter cycles by date range manually if needed
        const filteredCycles = allCyclesResult.cycles.filter((cycle) => {
          const cycleStart = new Date(cycle.startDate);
          const cycleEnd = new Date(cycle.endDate);
          return (
            cycleStart >= dateRange.startDate && cycleEnd <= dateRange.endDate
          );
        });

        const currentCycle =
          allCyclesResult.cycles.find((c) => c.status === "active") ||
          allCyclesResult.cycles[0] ||
          null;

        // Get confirmation stats for current cycle if exists
        let confirmationStats = null;
        if (currentCycle) {
          confirmationStats = await getConfirmationStatsForCycle(
            currentCycle.id
          );
        }

        // Get historical stats if requested
        let historicalStats = null;
        if (params.includeHistory) {
          const rawHistoricalStats = await getHistoricalStats({
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
          });

          // Transform to match expected frontend format
          historicalStats = {
            monthlyEarnings: rawHistoricalStats.monthlyStats.map((m) => ({
              month: m.month,
              grossEarnings: m.grossEarnings,
              platformFees: m.platformFees,
              sessionsCount: m.sessionsCount,
            })),
            weeklyEarnings: rawHistoricalStats.weeklyStats.map((w) => ({
              week: w.weekStart,
              grossEarnings: w.grossEarnings,
              platformFees: w.platformFees,
              sessionsCount: w.sessionsCount,
            })),
            cyclePerformance: rawHistoricalStats.cyclePerformance.map((c) => ({
              cycleId: c.id,
              startDate: c.startDate.toISOString(),
              endDate: c.endDate.toISOString(),
              status: c.status,
              totalEarnings: c.totalEarnings,
              platformFees: c.totalPlatformFees,
              confirmationRate:
                c.earningsCount > 0 ? c.confirmedCount / c.earningsCount : 0,
              chargeSuccessRate: c.collectionRate / 100,
            })),
            feeCollectionTrend: rawHistoricalStats.monthlyStats.map((m) => ({
              month: m.month,
              collected: m.collectedAmount,
              failed: m.failedAmount,
              waived: m.waivedAmount,
            })),
            confirmationTrend: rawHistoricalStats.monthlyStats.map((m) => ({
              month: m.month,
              confirmed: rawHistoricalStats.confirmationBreakdown.confirmed,
              disputed: rawHistoricalStats.confirmationBreakdown.disputed,
              autoConfirmed:
                rawHistoricalStats.confirmationBreakdown.autoConfirmed,
            })),
            statusDistribution: {
              earnings: {
                pending: rawHistoricalStats.confirmationBreakdown.pending,
                confirmed: rawHistoricalStats.confirmationBreakdown.confirmed,
                disputed: rawHistoricalStats.confirmationBreakdown.disputed,
                charged: rawHistoricalStats.feeCollectionBreakdown.completed,
              },
              feeCharges: {
                pending: rawHistoricalStats.feeCollectionBreakdown.pending,
                completed: rawHistoricalStats.feeCollectionBreakdown.completed,
                failed: rawHistoricalStats.feeCollectionBreakdown.failed,
                waived: rawHistoricalStats.feeCollectionBreakdown.waived,
              },
            },
            topProfessionals: rawHistoricalStats.topProfessionals.map((p) => ({
              id: p.id,
              name: p.name,
              totalEarnings: p.totalEarnings,
              platformFees: p.platformFees,
              sessionsCount: p.sessionsCount,
            })),
            summary: {
              totalGrossEarnings: rawHistoricalStats.summary.periodEarnings,
              totalPlatformFees: rawHistoricalStats.summary.periodPlatformFees,
              totalSessions: rawHistoricalStats.summary.periodSessions,
              averageSessionValue:
                rawHistoricalStats.summary.avgEarningPerSession,
              confirmationRate:
                rawHistoricalStats.summary.avgCollectionRate / 100,
              chargeSuccessRate:
                rawHistoricalStats.summary.avgCollectionRate / 100,
              growthRate: rawHistoricalStats.summary.earningsTrend / 100,
            },
          };
        }

        return NextResponse.json({
          currentCycle,
          confirmationStats,
          pendingDisputes: disputes.length,
          disputes: disputes.slice(0, 10),
          feeChargeSummary,
          blockedProfessionals: blockedPros,
          blockedCount: blockedPros.length,
          historicalStats,
          allCycles:
            filteredCycles.length > 0 ? filteredCycles : allCyclesResult.cycles,
        });
      }

      case "cycles": {
        if (params.cycleId) {
          const cycle = await getCycleWithStats(params.cycleId);
          if (!cycle) {
            return NextResponse.json(
              { error: "Cycle not found" },
              { status: 404 }
            );
          }

          const confirmationStats = await getConfirmationStatsForCycle(
            params.cycleId
          );
          const feeChargeSummary = await getFeeChargeSummaryForAdmin(
            params.cycleId
          );

          return NextResponse.json({
            cycle,
            confirmationStats,
            feeChargeSummary,
          });
        }

        const result = await getAllCyclesWithStats({
          status: params.status as CycleStatus | undefined,
          limit: params.limit,
          offset: (params.page - 1) * params.limit,
        });

        // Filter by date range manually
        const filteredCycles = result.cycles.filter((cycle) => {
          const cycleStart = new Date(cycle.startDate);
          const cycleEnd = new Date(cycle.endDate);
          return (
            cycleStart >= dateRange.startDate && cycleEnd <= dateRange.endDate
          );
        });

        return NextResponse.json({
          data: filteredCycles,
          total: filteredCycles.length,
          page: params.page,
          limit: params.limit,
          hasMore: params.page * params.limit < filteredCycles.length,
        });
      }

      case "disputes": {
        const disputes = await getDisputedConfirmations();
        return NextResponse.json({
          data: disputes,
          total: disputes.length,
        });
      }

      case "blocked": {
        const blockedPros = await getBlockedProfessionals();
        return NextResponse.json({
          data: blockedPros,
          total: blockedPros.length,
        });
      }

      default:
        return NextResponse.json(
          { error: "Invalid view parameter" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("GET admin payments error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
