// src/lib/services/payments/cycle.service.ts

import prisma from "@/lib/prisma";
import {
  PayoutCycle,
  CycleWithStats,
  CycleStatus,
  CycleInfo,
} from "@/types/payments";
import {
  getCycleDates,
  getDaysRemainingInCycle,
  getHoursUntilDeadline,
  isPastDeadline,
  getCyclesBetweenDates,
  getCycleStartDate,
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
        confirmationDeadline: cycleDates.confirmationDeadline,
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
    hoursUntilDeadline: getHoursUntilDeadline(),
    isProcessing:
      cycle.status === "processing" || cycle.status === "confirming",
  };
}

/**
 * Get cycle with aggregated statistics
 */
export async function getCycleWithStats(
  cycleId: string
): Promise<CycleWithStats | null> {
  const cycle = await prisma.payoutCycle.findUnique({
    where: { id: cycleId },
    include: {
      earnings: {
        select: {
          grossAmount: true,
          platformFeeAmount: true,
          status: true,
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
      acc.professionalIds.add(earning.professionalId);

      if (earning.status === "confirmed" || earning.status === "charged") {
        acc.confirmedCount++;
      } else if (earning.status === "pending") {
        acc.pendingCount++;
      } else if (earning.status === "disputed") {
        acc.disputedCount++;
      }

      return acc;
    },
    {
      totalEarnings: 0,
      totalPlatformFees: 0,
      confirmedCount: 0,
      pendingCount: 0,
      disputedCount: 0,
      professionalIds: new Set<string>(),
    }
  );

  return {
    ...cycle,
    status: castCycleStatus(cycle.status),
    totalEarnings: stats.totalEarnings,
    totalPlatformFees: stats.totalPlatformFees,
    earningsCount: cycle.earnings.length,
    confirmedCount: stats.confirmedCount,
    pendingCount: stats.pendingCount,
    disputedCount: stats.disputedCount,
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
  additionalData?: {
    autoConfirmRanAt?: Date;
    feeCollectionRanAt?: Date;
    completedAt?: Date;
  }
): Promise<PayoutCycle> {
  const cycle = await prisma.payoutCycle.update({
    where: { id: cycleId },
    data: {
      status,
      ...additionalData,
    },
  });

  return {
    ...cycle,
    status: castCycleStatus(cycle.status),
  };
}

/**
 * Get cycles ready for auto-confirmation (past deadline, still active)
 */
export async function getCyclesReadyForAutoConfirm(): Promise<PayoutCycle[]> {
  const activeCycles = await prisma.payoutCycle.findMany({
    where: {
      status: "active",
      autoConfirmRanAt: null,
    },
  });

  // Filter to those past deadline
  return activeCycles
    .filter((cycle) => isPastDeadline(cycle.startDate))
    .map((cycle) => ({
      ...cycle,
      status: castCycleStatus(cycle.status),
    }));
}

/**
 * Get cycles ready for fee collection (auto-confirm done, fees not collected)
 */
export async function getCyclesReadyForFeeCollection(): Promise<PayoutCycle[]> {
  const cycles = await prisma.payoutCycle.findMany({
    where: {
      status: "confirming",
      autoConfirmRanAt: { not: null },
      feeCollectionRanAt: null,
    },
  });

  return cycles.map((cycle) => ({
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
  const cycleStart = getCycleStartDate(appointmentEndTime);
  const cycleDates = getCycleDates(appointmentEndTime);

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
        confirmationDeadline: cycleDates.confirmationDeadline,
        status: isPastDeadline(cycleStart) ? "confirming" : "active",
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
 * Ensure all cycles exist between two dates
 */
export async function ensureCyclesExist(
  startDate: Date,
  endDate: Date
): Promise<PayoutCycle[]> {
  const cycleDatesList = getCyclesBetweenDates(startDate, endDate);
  const cycles: PayoutCycle[] = [];

  for (const dates of cycleDatesList) {
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
          confirmationDeadline: dates.confirmationDeadline,
          status: isPastDeadline(dates.startDate) ? "completed" : "active",
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
}): Promise<{ cycles: CycleWithStats[]; total: number }> {
  const { status, limit = 10, offset = 0 } = options || {};

  const [cycles, total] = await Promise.all([
    prisma.payoutCycle.findMany({
      where: status ? { status } : undefined,
      include: {
        earnings: {
          select: {
            grossAmount: true,
            platformFeeAmount: true,
            status: true,
            professionalId: true,
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

  const cyclesWithStats: CycleWithStats[] = cycles.map((cycle) => {
    const stats = cycle.earnings.reduce(
      (acc, earning) => {
        acc.totalEarnings += earning.grossAmount;
        acc.totalPlatformFees += earning.platformFeeAmount;
        acc.professionalIds.add(earning.professionalId);

        if (earning.status === "confirmed" || earning.status === "charged") {
          acc.confirmedCount++;
        } else if (earning.status === "pending") {
          acc.pendingCount++;
        } else if (earning.status === "disputed") {
          acc.disputedCount++;
        }

        return acc;
      },
      {
        totalEarnings: 0,
        totalPlatformFees: 0,
        confirmedCount: 0,
        pendingCount: 0,
        disputedCount: 0,
        professionalIds: new Set<string>(),
      }
    );

    return {
      id: cycle.id,
      startDate: cycle.startDate,
      endDate: cycle.endDate,
      confirmationDeadline: cycle.confirmationDeadline,
      status: castCycleStatus(cycle.status),
      autoConfirmRanAt: cycle.autoConfirmRanAt,
      feeCollectionRanAt: cycle.feeCollectionRanAt,
      completedAt: cycle.completedAt,
      createdAt: cycle.createdAt,
      updatedAt: cycle.updatedAt,
      totalEarnings: stats.totalEarnings,
      totalPlatformFees: stats.totalPlatformFees,
      earningsCount: cycle.earnings.length,
      confirmedCount: stats.confirmedCount,
      pendingCount: stats.pendingCount,
      disputedCount: stats.disputedCount,
      professionalCount: stats.professionalIds.size,
    };
  });

  return { cycles: cyclesWithStats, total };
}
