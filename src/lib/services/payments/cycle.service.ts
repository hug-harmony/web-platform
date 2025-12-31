// src/lib/services/payments/cycle.service.ts

import prisma from "@/lib/prisma";
import {
  PayoutCycle,
  PayoutCycleWithStats,
  CycleStatus,
  CycleInfo,
} from "@/types/payments";
import {
  getCurrentCycleStart,
  getCurrentCycleEnd,
  getCycleCutoffDate,
  getCycleDates,
  getDaysRemainingInCycle,
  getHoursUntilCutoff,
  isPastCutoff,
  getCyclesBetweenDates,
} from "@/lib/utils/paymentCycle";
import { castCycleStatus } from "./helpers";

// ============================================
// CYCLE RETRIEVAL
// ============================================

/**
 * Get or create the current active payout cycle
 */
export async function getOrCreateCurrentCycle(): Promise<PayoutCycle> {
  const cycleDates = getCycleDates();

  // Try to find existing cycle
  let cycle = await prisma.payoutCycle.findFirst({
    where: {
      startDate: cycleDates.startDate,
      endDate: cycleDates.endDate,
    },
  });

  // Create if doesn't exist
  if (!cycle) {
    cycle = await prisma.payoutCycle.create({
      data: {
        startDate: cycleDates.startDate,
        endDate: cycleDates.endDate,
        cutoffDate: cycleDates.cutoffDate,
        status: "active",
      },
    });
  }

  return {
    ...cycle,
    status: castCycleStatus(cycle.status),
  };
}

/**
 * Get cycle by ID
 */
export async function getCycleById(
  cycleId: string
): Promise<PayoutCycle | null> {
  const cycle = await prisma.payoutCycle.findUnique({
    where: { id: cycleId },
  });

  if (!cycle) return null;

  return {
    ...cycle,
    status: castCycleStatus(cycle.status),
  };
}

/**
 * Get cycle by date range
 */
export async function getCycleByDateRange(
  startDate: Date,
  endDate: Date
): Promise<PayoutCycle | null> {
  const cycle = await prisma.payoutCycle.findFirst({
    where: {
      startDate,
      endDate,
    },
  });

  if (!cycle) return null;

  return {
    ...cycle,
    status: castCycleStatus(cycle.status),
  };
}

/**
 * Get current cycle info with remaining time
 */
export async function getCurrentCycleInfo(): Promise<CycleInfo> {
  const cycle = await getOrCreateCurrentCycle();

  return {
    current: cycle,
    daysRemaining: getDaysRemainingInCycle(),
    hoursUntilCutoff: getHoursUntilCutoff(),
    isProcessing: cycle.status === "processing",
  };
}

/**
 * Get cycle with aggregated statistics
 */
export async function getCycleWithStats(
  cycleId: string
): Promise<PayoutCycleWithStats | null> {
  const cycle = await prisma.payoutCycle.findUnique({
    where: { id: cycleId },
    include: {
      earnings: {
        where: {
          status: { in: ["confirmed", "paid"] },
        },
        select: {
          grossAmount: true,
          platformFeeAmount: true,
          netAmount: true,
          professionalId: true,
        },
      },
    },
  });

  if (!cycle) return null;

  // Calculate stats
  const stats = cycle.earnings.reduce(
    (acc, earning) => {
      acc.totalEarnings += earning.grossAmount;
      acc.totalPlatformFees += earning.platformFeeAmount;
      acc.totalNetAmount += earning.netAmount;
      acc.professionalIds.add(earning.professionalId);
      return acc;
    },
    {
      totalEarnings: 0,
      totalPlatformFees: 0,
      totalNetAmount: 0,
      professionalIds: new Set<string>(),
    }
  );

  return {
    ...cycle,
    status: castCycleStatus(cycle.status),
    totalEarnings: stats.totalEarnings,
    totalPlatformFees: stats.totalPlatformFees,
    totalNetAmount: stats.totalNetAmount,
    earningsCount: cycle.earnings.length,
    professionalCount: stats.professionalIds.size,
  };
}

// ============================================
// CYCLE MANAGEMENT
// ============================================

/**
 * Update cycle status
 */
export async function updateCycleStatus(
  cycleId: string,
  status: CycleStatus,
  processedAt?: Date
): Promise<PayoutCycle> {
  const cycle = await prisma.payoutCycle.update({
    where: { id: cycleId },
    data: {
      status,
      processedAt: processedAt || (status === "completed" ? new Date() : null),
    },
  });

  return {
    ...cycle,
    status: castCycleStatus(cycle.status),
  };
}

/**
 * Get cycles ready for processing (past cutoff, still active)
 */
export async function getCyclesReadyForProcessing(): Promise<PayoutCycle[]> {
  // Get all active cycles
  const activeCycles = await prisma.payoutCycle.findMany({
    where: {
      status: "active",
    },
  });

  // Filter to those past cutoff and cast types
  return activeCycles
    .filter((cycle) => isPastCutoff(cycle.startDate))
    .map((cycle) => ({
      ...cycle,
      status: castCycleStatus(cycle.status),
    }));
}

/**
 * Get cycle for a specific appointment end time
 */
export async function getCycleForAppointment(
  appointmentEndTime: Date
): Promise<PayoutCycle> {
  const cycleStart = getCurrentCycleStart(appointmentEndTime);
  const cycleEnd = getCurrentCycleEnd(appointmentEndTime);
  const cutoffDate = getCycleCutoffDate(cycleStart);

  // Try to find existing cycle
  let cycle = await prisma.payoutCycle.findFirst({
    where: {
      startDate: cycleStart,
      endDate: cycleEnd,
    },
  });

  // Create if doesn't exist
  if (!cycle) {
    cycle = await prisma.payoutCycle.create({
      data: {
        startDate: cycleStart,
        endDate: cycleEnd,
        cutoffDate,
        status: "active",
      },
    });
  }

  return {
    ...cycle,
    status: castCycleStatus(cycle.status),
  };
}

// ============================================
// CYCLE HISTORY
// ============================================

/**
 * Get all cycles for a professional
 */
export async function getCyclesForProfessional(
  professionalId: string,
  options?: {
    status?: CycleStatus;
    limit?: number;
    offset?: number;
  }
): Promise<PayoutCycle[]> {
  const { status, limit = 10, offset = 0 } = options || {};

  // Get cycles that have earnings for this professional
  const cyclesWithEarnings = await prisma.payoutCycle.findMany({
    where: {
      earnings: {
        some: {
          professionalId,
        },
      },
      ...(status && { status }),
    },
    orderBy: {
      startDate: "desc",
    },
    take: limit,
    skip: offset,
  });

  return cyclesWithEarnings.map((cycle) => ({
    ...cycle,
    status: castCycleStatus(cycle.status),
  }));
}

/**
 * Get cycle count for a professional
 */
export async function getCycleCountForProfessional(
  professionalId: string
): Promise<number> {
  return prisma.payoutCycle.count({
    where: {
      earnings: {
        some: {
          professionalId,
        },
      },
    },
  });
}

/**
 * Ensure all cycles exist between two dates (for history view)
 */
export async function ensureCyclesExist(
  startDate: Date,
  endDate: Date
): Promise<PayoutCycle[]> {
  const cycleDates = getCyclesBetweenDates(startDate, endDate);
  const cycles: PayoutCycle[] = [];

  for (const dates of cycleDates) {
    let cycle = await prisma.payoutCycle.findFirst({
      where: {
        startDate: dates.startDate,
        endDate: dates.endDate,
      },
    });

    if (!cycle) {
      cycle = await prisma.payoutCycle.create({
        data: {
          startDate: dates.startDate,
          endDate: dates.endDate,
          cutoffDate: dates.cutoffDate,
          status: isPastCutoff(dates.startDate) ? "completed" : "active",
        },
      });
    }

    cycles.push({
      ...cycle,
      status: castCycleStatus(cycle.status),
    });
  }

  return cycles;
}

// ============================================
// ADMIN FUNCTIONS
// ============================================

/**
 * Get all cycles with stats for admin dashboard
 */
export async function getAllCyclesWithStats(options?: {
  status?: CycleStatus;
  limit?: number;
  offset?: number;
}): Promise<{ cycles: PayoutCycleWithStats[]; total: number }> {
  const { status, limit = 10, offset = 0 } = options || {};

  const [cycles, total] = await Promise.all([
    prisma.payoutCycle.findMany({
      where: status ? { status } : undefined,
      include: {
        earnings: {
          where: {
            status: { in: ["confirmed", "paid"] },
          },
          select: {
            grossAmount: true,
            platformFeeAmount: true,
            netAmount: true,
            professionalId: true,
          },
        },
        _count: {
          select: {
            payouts: true,
          },
        },
      },
      orderBy: {
        startDate: "desc",
      },
      take: limit,
      skip: offset,
    }),
    prisma.payoutCycle.count({
      where: status ? { status } : undefined,
    }),
  ]);

  const cyclesWithStats: PayoutCycleWithStats[] = cycles.map((cycle) => {
    const stats = cycle.earnings.reduce(
      (acc, earning) => {
        acc.totalEarnings += earning.grossAmount;
        acc.totalPlatformFees += earning.platformFeeAmount;
        acc.totalNetAmount += earning.netAmount;
        acc.professionalIds.add(earning.professionalId);
        return acc;
      },
      {
        totalEarnings: 0,
        totalPlatformFees: 0,
        totalNetAmount: 0,
        professionalIds: new Set<string>(),
      }
    );

    return {
      id: cycle.id,
      startDate: cycle.startDate,
      endDate: cycle.endDate,
      cutoffDate: cycle.cutoffDate,
      status: castCycleStatus(cycle.status),
      processedAt: cycle.processedAt,
      createdAt: cycle.createdAt,
      updatedAt: cycle.updatedAt,
      totalEarnings: stats.totalEarnings,
      totalPlatformFees: stats.totalPlatformFees,
      totalNetAmount: stats.totalNetAmount,
      earningsCount: cycle.earnings.length,
      professionalCount: stats.professionalIds.size,
    };
  });

  return { cycles: cyclesWithStats, total };
}
