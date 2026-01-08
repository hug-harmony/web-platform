// src/lib/services/payments/historicalStats.ts

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// ============================================
// TYPES
// ============================================

export interface HistoricalFilters {
  startDate?: Date;
  endDate?: Date;
  datePreset?:
    | "thisWeek"
    | "lastWeek"
    | "thisMonth"
    | "lastMonth"
    | "thisQuarter"
    | "lastQuarter"
    | "thisYear"
    | "lastYear"
    | "all";
  professionalId?: string;
  cycleId?: string;
  year?: number;
  month?: number;
}

export interface DailyStats {
  date: string;
  sessionsCount: number;
  grossEarnings: number;
  platformFees: number;
  confirmedCount: number;
  disputedCount: number;
}

export interface WeeklyStats {
  weekStart: string;
  weekEnd: string;
  sessionsCount: number;
  grossEarnings: number;
  platformFees: number;
  confirmedCount: number;
  disputedCount: number;
}

export interface MonthlyStats {
  month: string;
  monthLabel: string;
  sessionsCount: number;
  grossEarnings: number;
  platformFees: number;
  collectedAmount: number;
  waivedAmount: number;
  failedAmount: number;
  cyclesCompleted: number;
}

export interface CyclePerformance {
  id: string;
  startDate: Date;
  endDate: Date;
  status: string;
  totalEarnings: number;
  totalPlatformFees: number;
  totalCollected: number;
  earningsCount: number;
  confirmedCount: number;
  disputedCount: number;
  notOccurredCount: number;
  feeChargesCount: number;
  feeChargesCompleted: number;
  feeChargesFailed: number;
  feeChargesWaived: number;
  collectionRate: number;
  professionalCount: number;
}

export interface ConsolidatedSummary {
  // Lifetime totals
  lifetimeEarnings: number;
  lifetimePlatformFees: number;
  lifetimeCollected: number;
  lifetimeWaived: number;
  lifetimeSessions: number;
  lifetimeCycles: number;

  // Period totals (based on filter)
  periodEarnings: number;
  periodPlatformFees: number;
  periodCollected: number;
  periodWaived: number;
  periodFailed: number;
  periodSessions: number;
  periodCycles: number;

  // Averages
  avgEarningPerSession: number;
  avgFeePerSession: number;
  avgSessionsPerCycle: number;
  avgCollectionRate: number;

  // Trends (compared to previous period)
  earningsTrend: number;
  sessionsTrend: number;
  collectionTrend: number;
}

export interface HistoricalData {
  summary: ConsolidatedSummary;
  dailyStats: DailyStats[];
  weeklyStats: WeeklyStats[];
  monthlyStats: MonthlyStats[];
  cyclePerformance: CyclePerformance[];
  confirmationBreakdown: {
    confirmed: number;
    notOccurred: number;
    disputed: number;
    autoConfirmed: number;
    pending: number;
  };
  feeCollectionBreakdown: {
    completed: number;
    failed: number;
    waived: number;
    pending: number;
    processing: number;
  };
  topProfessionals: {
    id: string;
    name: string;
    image: string | null;
    totalEarnings: number;
    sessionsCount: number;
    platformFees: number;
  }[];
}

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getDateRangeFromPreset(preset: string): {
  start: Date;
  end: Date;
} {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (preset) {
    case "thisWeek": {
      const start = new Date(today);
      start.setDate(today.getDate() - today.getDay());
      return { start, end: now };
    }
    case "lastWeek": {
      const end = new Date(today);
      end.setDate(today.getDate() - today.getDay() - 1);
      end.setHours(23, 59, 59, 999);
      const start = new Date(end);
      start.setDate(end.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      return { start, end };
    }
    case "thisMonth": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start, end: now };
    }
    case "lastMonth": {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(
        now.getFullYear(),
        now.getMonth(),
        0,
        23,
        59,
        59,
        999
      );
      return { start, end };
    }
    case "thisQuarter": {
      const quarter = Math.floor(now.getMonth() / 3);
      const start = new Date(now.getFullYear(), quarter * 3, 1);
      return { start, end: now };
    }
    case "lastQuarter": {
      const quarter = Math.floor(now.getMonth() / 3);
      const start = new Date(now.getFullYear(), (quarter - 1) * 3, 1);
      const end = new Date(now.getFullYear(), quarter * 3, 0, 23, 59, 59, 999);
      return { start, end };
    }
    case "thisYear": {
      const start = new Date(now.getFullYear(), 0, 1);
      return { start, end: now };
    }
    case "lastYear": {
      const start = new Date(now.getFullYear() - 1, 0, 1);
      const end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
      return { start, end };
    }
    default:
      // All time - 3 years back
      const start = new Date(now.getFullYear() - 3, 0, 1);
      return { start, end: now };
  }
}

function getWeekNumber(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay()); // Start of week (Sunday)
  return d.toISOString().split("T")[0];
}

function getWeekEnd(weekStart: string): string {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + 6);
  return d.toISOString().split("T")[0];
}

// ============================================
// MAIN FUNCTIONS
// ============================================

export async function getHistoricalStats(
  filters: HistoricalFilters
): Promise<HistoricalData> {
  // Determine date range
  let startDate = filters.startDate;
  let endDate = filters.endDate;

  if (filters.datePreset && filters.datePreset !== "all") {
    const range = getDateRangeFromPreset(filters.datePreset);
    startDate = range.start;
    endDate = range.end;
  } else if (filters.year) {
    startDate = new Date(
      filters.year,
      filters.month ? filters.month - 1 : 0,
      1
    );
    endDate = filters.month
      ? new Date(filters.year, filters.month, 0, 23, 59, 59, 999)
      : new Date(filters.year, 11, 31, 23, 59, 59, 999);
  }

  // Build where clauses
  const earningsWhere: Prisma.EarningWhereInput = {};
  const cyclesWhere: Prisma.PayoutCycleWhereInput = {};
  const feeChargesWhere: Prisma.FeeChargeWhereInput = {};
  const confirmationsWhere: Prisma.AppointmentConfirmationWhereInput = {};

  if (startDate || endDate) {
    earningsWhere.sessionStartTime = {
      ...(startDate && { gte: startDate }),
      ...(endDate && { lte: endDate }),
    };

    confirmationsWhere.createdAt = {
      ...(startDate && { gte: startDate }),
      ...(endDate && { lte: endDate }),
    };
  }

  if (startDate) {
    cyclesWhere.startDate = { gte: startDate };
  }

  if (endDate) {
    cyclesWhere.endDate = { lte: endDate };
  }
  if (filters.professionalId) {
    earningsWhere.professionalId = filters.professionalId;
    feeChargesWhere.professionalId = filters.professionalId;
  }
  if (filters.cycleId) {
    earningsWhere.cycleId = filters.cycleId;
    feeChargesWhere.cycleId = filters.cycleId;
  }

  // Parallel data fetching
  const [
    periodEarnings,
    periodCycles,
    periodFeeCharges,
    periodConfirmations,
    lifetimeStats,
    previousPeriodStats,
    topProfessionalsRaw,
  ] = await Promise.all([
    // Period earnings
    prisma.earning.findMany({
      where: earningsWhere,
      orderBy: { sessionStartTime: "asc" },
      include: {
        professional: { select: { id: true, name: true, image: true } },
      },
    }),

    // Period cycles
    prisma.payoutCycle.findMany({
      where: cyclesWhere,
      include: {
        earnings: true,
        feeCharges: true,
      },
      orderBy: { startDate: "desc" },
    }),

    // Period fee charges
    prisma.feeCharge.findMany({
      where: {
        ...feeChargesWhere,
        cycle: cyclesWhere,
      },
      include: {
        cycle: { select: { id: true, startDate: true, endDate: true } },
      },
    }),

    // Period confirmations
    prisma.appointmentConfirmation.findMany({
      where: confirmationsWhere,
    }),

    // Lifetime stats
    prisma.earning.aggregate({
      _sum: {
        grossAmount: true,
        platformFeeAmount: true,
      },
      _count: true,
    }),

    // Previous period stats (for trend calculation)
    startDate && endDate
      ? (async () => {
          const periodLength = endDate.getTime() - startDate.getTime();
          const prevStart = new Date(startDate.getTime() - periodLength);
          const prevEnd = new Date(startDate.getTime() - 1);

          return prisma.earning.aggregate({
            where: {
              sessionStartTime: { gte: prevStart, lte: prevEnd },
              ...(filters.professionalId && {
                professionalId: filters.professionalId,
              }),
            },
            _sum: {
              grossAmount: true,
              platformFeeAmount: true,
            },
            _count: true,
          });
        })()
      : Promise.resolve(null),

    // Top professionals
    prisma.earning.groupBy({
      by: ["professionalId"],
      where: earningsWhere,
      _sum: {
        grossAmount: true,
        platformFeeAmount: true,
      },
      _count: true,
      orderBy: {
        _sum: {
          grossAmount: "desc",
        },
      },
      take: 10,
    }),
  ]);

  // Get lifetime cycles count and collected amount
  const [lifetimeCyclesCount, lifetimeFeeCharges] = await Promise.all([
    prisma.payoutCycle.count(),
    prisma.feeCharge.aggregate({
      where: { status: "completed" },
      _sum: { chargedAmount: true },
    }),
  ]);

  const lifetimeWaivedCharges = await prisma.feeCharge.aggregate({
    where: { status: "waived" },
    _sum: { amountToCharge: true },
  });

  // Fetch professional details for top professionals
  const topProfessionalIds = topProfessionalsRaw.map((p) => p.professionalId);
  const professionals = await prisma.professional.findMany({
    where: { id: { in: topProfessionalIds } },
    select: { id: true, name: true, image: true },
  });
  const professionalsMap = new Map(professionals.map((p) => [p.id, p]));

  // Calculate period totals
  const periodTotalEarnings = periodEarnings.reduce(
    (sum, e) => sum + e.grossAmount,
    0
  );
  const periodTotalFees = periodEarnings.reduce(
    (sum, e) => sum + e.platformFeeAmount,
    0
  );
  const periodCollected = periodFeeCharges
    .filter((fc) => fc.status === "completed")
    .reduce((sum, fc) => sum + (fc.chargedAmount || 0), 0);
  const periodWaived = periodFeeCharges
    .filter((fc) => fc.status === "waived")
    .reduce((sum, fc) => sum + fc.amountToCharge, 0);
  const periodFailed = periodFeeCharges
    .filter((fc) => fc.status === "failed")
    .reduce((sum, fc) => sum + fc.amountToCharge, 0);

  // Calculate trends
  const prevEarnings = previousPeriodStats?._sum?.grossAmount || 0;
  const prevSessions = previousPeriodStats?._count || 0;
  const earningsTrend =
    prevEarnings > 0
      ? ((periodTotalEarnings - prevEarnings) / prevEarnings) * 100
      : 0;
  const sessionsTrend =
    prevSessions > 0
      ? ((periodEarnings.length - prevSessions) / prevSessions) * 100
      : 0;

  // Group by day
  const dailyMap = new Map<string, DailyStats>();
  periodEarnings.forEach((e) => {
    const date = e.sessionStartTime.toISOString().split("T")[0];
    const existing = dailyMap.get(date) || {
      date,
      sessionsCount: 0,
      grossEarnings: 0,
      platformFees: 0,
      confirmedCount: 0,
      disputedCount: 0,
    };
    existing.sessionsCount++;
    existing.grossEarnings += e.grossAmount;
    existing.platformFees += e.platformFeeAmount;
    if (e.status === "confirmed" || e.status === "charged")
      existing.confirmedCount++;
    if (e.status === "disputed") existing.disputedCount++;
    dailyMap.set(date, existing);
  });

  // Group by week
  const weeklyMap = new Map<string, WeeklyStats>();
  periodEarnings.forEach((e) => {
    const weekStart = getWeekNumber(e.sessionStartTime);
    const existing = weeklyMap.get(weekStart) || {
      weekStart,
      weekEnd: getWeekEnd(weekStart),
      sessionsCount: 0,
      grossEarnings: 0,
      platformFees: 0,
      confirmedCount: 0,
      disputedCount: 0,
    };
    existing.sessionsCount++;
    existing.grossEarnings += e.grossAmount;
    existing.platformFees += e.platformFeeAmount;
    if (e.status === "confirmed" || e.status === "charged")
      existing.confirmedCount++;
    if (e.status === "disputed") existing.disputedCount++;
    weeklyMap.set(weekStart, existing);
  });

  // Group by month
  const monthlyMap = new Map<string, MonthlyStats>();
  periodEarnings.forEach((e) => {
    const month = e.sessionStartTime.toISOString().slice(0, 7);
    const existing = monthlyMap.get(month) || {
      month,
      monthLabel: new Date(month + "-01").toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      }),
      sessionsCount: 0,
      grossEarnings: 0,
      platformFees: 0,
      collectedAmount: 0,
      waivedAmount: 0,
      failedAmount: 0,
      cyclesCompleted: 0,
    };
    existing.sessionsCount++;
    existing.grossEarnings += e.grossAmount;
    existing.platformFees += e.platformFeeAmount;
    monthlyMap.set(month, existing);
  });

  // Add fee charge data to monthly stats
  periodFeeCharges.forEach((fc) => {
    const month = fc.cycle.startDate.toISOString().slice(0, 7);
    const existing = monthlyMap.get(month);
    if (existing) {
      if (fc.status === "completed")
        existing.collectedAmount += fc.chargedAmount || 0;
      if (fc.status === "waived") existing.waivedAmount += fc.amountToCharge;
      if (fc.status === "failed") existing.failedAmount += fc.amountToCharge;
    }
  });

  // Cycle performance
  const cyclePerformance: CyclePerformance[] = periodCycles.map((cycle) => {
    const cycleEarnings = cycle.earnings;
    const cycleFeeCharges = cycle.feeCharges;
    const totalEarnings = cycleEarnings.reduce(
      (sum, e) => sum + e.grossAmount,
      0
    );
    const totalPlatformFees = cycleEarnings.reduce(
      (sum, e) => sum + e.platformFeeAmount,
      0
    );
    const confirmedCount = cycleEarnings.filter(
      (e) => e.status === "confirmed" || e.status === "charged"
    ).length;
    const disputedCount = cycleEarnings.filter(
      (e) => e.status === "disputed"
    ).length;
    const notOccurredCount = cycleEarnings.filter(
      (e) => e.status === "not_occurred"
    ).length;
    const completedCharges = cycleFeeCharges.filter(
      (fc) => fc.status === "completed"
    );
    const totalCollected = completedCharges.reduce(
      (sum, fc) => sum + (fc.chargedAmount || 0),
      0
    );

    return {
      id: cycle.id,
      startDate: cycle.startDate,
      endDate: cycle.endDate,
      status: cycle.status,
      totalEarnings,
      totalPlatformFees,
      totalCollected,
      earningsCount: cycleEarnings.length,
      confirmedCount,
      disputedCount,
      notOccurredCount,
      feeChargesCount: cycleFeeCharges.length,
      feeChargesCompleted: completedCharges.length,
      feeChargesFailed: cycleFeeCharges.filter((fc) => fc.status === "failed")
        .length,
      feeChargesWaived: cycleFeeCharges.filter((fc) => fc.status === "waived")
        .length,
      collectionRate:
        cycleFeeCharges.length > 0
          ? (completedCharges.length / cycleFeeCharges.length) * 100
          : 0,
      professionalCount: new Set(cycleEarnings.map((e) => e.professionalId))
        .size,
    };
  });

  // Confirmation breakdown
  const confirmationBreakdown = {
    confirmed: periodConfirmations.filter((c) => c.finalStatus === "confirmed")
      .length,
    notOccurred: periodConfirmations.filter(
      (c) =>
        c.finalStatus === "not_occurred" ||
        c.finalStatus === "auto_not_occurred"
    ).length,
    disputed: periodConfirmations.filter((c) => c.isDisputed).length,
    autoConfirmed: periodConfirmations.filter((c) => c.autoResolvedAt !== null)
      .length,
    pending: periodConfirmations.filter((c) => c.finalStatus === "pending")
      .length,
  };

  // Fee collection breakdown
  const feeCollectionBreakdown = {
    completed: periodFeeCharges.filter((fc) => fc.status === "completed")
      .length,
    failed: periodFeeCharges.filter((fc) => fc.status === "failed").length,
    waived: periodFeeCharges.filter((fc) => fc.status === "waived").length,
    pending: periodFeeCharges.filter((fc) => fc.status === "pending").length,
    processing: periodFeeCharges.filter((fc) => fc.status === "processing")
      .length,
  };

  // Top professionals with details
  const topProfessionals = topProfessionalsRaw.map((p) => {
    const pro = professionalsMap.get(p.professionalId);
    return {
      id: p.professionalId,
      name: pro?.name || "Unknown",
      image: pro?.image || null,
      totalEarnings: p._sum.grossAmount || 0,
      sessionsCount: p._count,
      platformFees: p._sum.platformFeeAmount || 0,
    };
  });

  // Calculate average collection rate across cycles
  const avgCollectionRate =
    cyclePerformance.length > 0
      ? cyclePerformance.reduce((sum, c) => sum + c.collectionRate, 0) /
        cyclePerformance.length
      : 0;

  // Calculate previous period collection for trend
  const collectionTrend = 0; // Would need previous period fee charges

  return {
    summary: {
      lifetimeEarnings: lifetimeStats._sum.grossAmount || 0,
      lifetimePlatformFees: lifetimeStats._sum.platformFeeAmount || 0,
      lifetimeCollected: lifetimeFeeCharges._sum.chargedAmount || 0,
      lifetimeWaived: lifetimeWaivedCharges._sum.amountToCharge || 0,
      lifetimeSessions: lifetimeStats._count,
      lifetimeCycles: lifetimeCyclesCount,

      periodEarnings: periodTotalEarnings,
      periodPlatformFees: periodTotalFees,
      periodCollected,
      periodWaived,
      periodFailed,
      periodSessions: periodEarnings.length,
      periodCycles: periodCycles.length,

      avgEarningPerSession:
        periodEarnings.length > 0
          ? periodTotalEarnings / periodEarnings.length
          : 0,
      avgFeePerSession:
        periodEarnings.length > 0 ? periodTotalFees / periodEarnings.length : 0,
      avgSessionsPerCycle:
        periodCycles.length > 0
          ? periodEarnings.length / periodCycles.length
          : 0,
      avgCollectionRate,

      earningsTrend,
      sessionsTrend,
      collectionTrend,
    },
    dailyStats: Array.from(dailyMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    ),
    weeklyStats: Array.from(weeklyMap.values()).sort((a, b) =>
      a.weekStart.localeCompare(b.weekStart)
    ),
    monthlyStats: Array.from(monthlyMap.values()).sort((a, b) =>
      a.month.localeCompare(b.month)
    ),
    cyclePerformance,
    confirmationBreakdown,
    feeCollectionBreakdown,
    topProfessionals,
  };
}

// ============================================
// EARNINGS LIST
// ============================================

export interface EarningsListFilters {
  startDate?: Date;
  endDate?: Date;
  datePreset?: string;
  professionalId?: string;
  cycleId?: string;
  status?: string;
  page?: number;
  limit?: number;
  sortBy?:
    | "sessionStartTime"
    | "grossAmount"
    | "platformFeeAmount"
    | "createdAt";
  sortOrder?: "asc" | "desc";
}

export async function getEarningsList(filters: EarningsListFilters) {
  let startDate = filters.startDate;
  let endDate = filters.endDate;

  if (filters.datePreset && filters.datePreset !== "all") {
    const range = getDateRangeFromPreset(filters.datePreset);
    startDate = range.start;
    endDate = range.end;
  }

  const where: Prisma.EarningWhereInput = {};

  if (startDate || endDate) {
    where.sessionStartTime = {};
    if (startDate) where.sessionStartTime.gte = startDate;
    if (endDate) where.sessionStartTime.lte = endDate;
  }
  if (filters.professionalId) where.professionalId = filters.professionalId;
  if (filters.cycleId) where.cycleId = filters.cycleId;
  if (filters.status) where.status = filters.status;

  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const skip = (page - 1) * limit;

  const [earnings, total] = await Promise.all([
    prisma.earning.findMany({
      where,
      include: {
        professional: { select: { id: true, name: true, image: true } },
        appointment: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                firstName: true,
                lastName: true,
                profileImage: true,
              },
            },
          },
        },
        cycle: {
          select: { id: true, startDate: true, endDate: true, status: true },
        },
      },
      orderBy: {
        [filters.sortBy || "sessionStartTime"]: filters.sortOrder || "desc",
      },
      skip,
      take: limit,
    }),
    prisma.earning.count({ where }),
  ]);

  return {
    data: earnings,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasMore: page * limit < total,
  };
}

// ============================================
// FEE CHARGES LIST
// ============================================

export interface FeeChargesListFilters {
  startDate?: Date;
  endDate?: Date;
  datePreset?: string;
  professionalId?: string;
  cycleId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export async function getFeeChargesList(filters: FeeChargesListFilters) {
  let startDate = filters.startDate;
  let endDate = filters.endDate;

  if (filters.datePreset && filters.datePreset !== "all") {
    const range = getDateRangeFromPreset(filters.datePreset);
    startDate = range.start;
    endDate = range.end;
  }

  const where: Prisma.FeeChargeWhereInput = {};

  if (startDate || endDate) {
    where.cycle = {};
    if (startDate) where.cycle.startDate = { gte: startDate };
    if (endDate) where.cycle.endDate = { lte: endDate };
  }
  if (filters.professionalId) where.professionalId = filters.professionalId;
  if (filters.cycleId) where.cycleId = filters.cycleId;
  if (filters.status) where.status = filters.status;

  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const skip = (page - 1) * limit;

  const [feeCharges, total] = await Promise.all([
    prisma.feeCharge.findMany({
      where,
      include: {
        professional: { select: { id: true, name: true, image: true } },
        cycle: {
          select: { id: true, startDate: true, endDate: true, status: true },
        },
        earnings: {
          select: { id: true, grossAmount: true, platformFeeAmount: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.feeCharge.count({ where }),
  ]);

  return {
    data: feeCharges,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasMore: page * limit < total,
  };
}

// ============================================
// CYCLES LIST
// ============================================

export interface CyclesListFilters {
  startDate?: Date;
  endDate?: Date;
  datePreset?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export async function getCyclesList(filters: CyclesListFilters) {
  let startDate = filters.startDate;
  let endDate = filters.endDate;

  if (filters.datePreset && filters.datePreset !== "all") {
    const range = getDateRangeFromPreset(filters.datePreset);
    startDate = range.start;
    endDate = range.end;
  }

  const where: Prisma.PayoutCycleWhereInput = {};

  if (startDate) where.startDate = { gte: startDate };
  if (endDate) where.endDate = { lte: endDate };
  if (filters.status) where.status = filters.status;

  const page = filters.page || 1;
  const limit = filters.limit || 10;
  const skip = (page - 1) * limit;

  const [cycles, total] = await Promise.all([
    prisma.payoutCycle.findMany({
      where,
      include: {
        earnings: true,
        feeCharges: true,
      },
      orderBy: { startDate: "desc" },
      skip,
      take: limit,
    }),
    prisma.payoutCycle.count({ where }),
  ]);

  const cyclesWithStats = cycles.map((cycle) => {
    const totalEarnings = cycle.earnings.reduce(
      (sum, e) => sum + e.grossAmount,
      0
    );
    const totalPlatformFees = cycle.earnings.reduce(
      (sum, e) => sum + e.platformFeeAmount,
      0
    );
    const confirmedEarnings = cycle.earnings.filter(
      (e) => e.status === "confirmed" || e.status === "charged"
    ).length;
    const completedCharges = cycle.feeCharges.filter(
      (fc) => fc.status === "completed"
    );
    const totalCollected = completedCharges.reduce(
      (sum, fc) => sum + (fc.chargedAmount || 0),
      0
    );

    return {
      id: cycle.id,
      startDate: cycle.startDate,
      endDate: cycle.endDate,
      confirmationDeadline: cycle.confirmationDeadline,
      status: cycle.status,
      autoConfirmRanAt: cycle.autoConfirmRanAt,
      feeCollectionRanAt: cycle.feeCollectionRanAt,
      completedAt: cycle.completedAt,
      totalEarnings,
      totalPlatformFees,
      totalCollected,
      earningsCount: cycle.earnings.length,
      confirmedCount: confirmedEarnings,
      disputedCount: cycle.earnings.filter((e) => e.status === "disputed")
        .length,
      feeChargesCount: cycle.feeCharges.length,
      feeChargesCompleted: completedCharges.length,
      feeChargesFailed: cycle.feeCharges.filter((fc) => fc.status === "failed")
        .length,
      feeChargesWaived: cycle.feeCharges.filter((fc) => fc.status === "waived")
        .length,
      professionalCount: new Set(cycle.earnings.map((e) => e.professionalId))
        .size,
    };
  });

  return {
    data: cyclesWithStats,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasMore: page * limit < total,
  };
}
