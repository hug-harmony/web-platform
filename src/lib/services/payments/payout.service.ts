// src/lib/services/payments/payout.service.ts

import prisma from "@/lib/prisma";
import {
  Payout,
  PayoutWithDetails,
  PayoutStatus,
  PayoutHistoryItem,
  PayoutHistoryFilters,
  PayoutsResponse,
} from "@/types/payments";
import {
  updateCycleStatus,
  getCyclesReadyForProcessing,
} from "./cycle.service";
import { markEarningsAsPaid, getEarningsForCycle } from "./earnings.service";
import { createPaymentNotification } from "@/lib/notifications";
import { formatCycleDateRange } from "@/lib/utils/paymentCycle";
import { castPayoutStatus, castCycleStatus } from "./helpers";

// ============================================
// PAYOUT CREATION
// ============================================

/**
 * Create a payout record for a professional for a specific cycle
 */
export async function createPayout(
  professionalId: string,
  cycleId: string
): Promise<Payout | null> {
  // Check if payout already exists
  const existingPayout = await prisma.payout.findUnique({
    where: {
      professionalId_cycleId: {
        professionalId,
        cycleId,
      },
    },
  });

  if (existingPayout) {
    return {
      ...existingPayout,
      status: castPayoutStatus(existingPayout.status),
    };
  }

  // Get confirmed earnings for this professional in this cycle
  const earnings = await prisma.earning.findMany({
    where: {
      professionalId,
      cycleId,
      status: "confirmed",
    },
  });

  if (earnings.length === 0) {
    return null; // No earnings to pay out
  }

  // Calculate totals
  const totals = earnings.reduce(
    (acc, earning) => ({
      gross: acc.gross + earning.grossAmount,
      platformFee: acc.platformFee + earning.platformFeeAmount,
      net: acc.net + earning.netAmount,
    }),
    { gross: 0, platformFee: 0, net: 0 }
  );

  // Create payout
  const payout = await prisma.payout.create({
    data: {
      professionalId,
      cycleId,
      grossTotal: totals.gross,
      platformFeeTotal: totals.platformFee,
      netTotal: totals.net,
      earningsCount: earnings.length,
      status: "pending",
    },
  });

  return {
    ...payout,
    status: castPayoutStatus(payout.status),
  };
}

/**
 * Create payouts for all professionals with confirmed earnings in a cycle
 */
export async function createPayoutsForCycle(cycleId: string): Promise<{
  created: number;
  skipped: number;
  errors: string[];
}> {
  // Get all professionals with confirmed earnings in this cycle
  const professionalsWithEarnings = await prisma.earning.groupBy({
    by: ["professionalId"],
    where: {
      cycleId,
      status: "confirmed",
    },
  });

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const { professionalId } of professionalsWithEarnings) {
    try {
      const payout = await createPayout(professionalId, cycleId);
      if (payout) {
        created++;
      } else {
        skipped++;
      }
    } catch (error) {
      errors.push(
        `Failed to create payout for professional ${professionalId}: ${error}`
      );
    }
  }

  return { created, skipped, errors };
}

// ============================================
// PAYOUT PROCESSING
// ============================================

/**
 * Process a single payout (mark as processing, then completed)
 * In the future, this will integrate with Stripe
 */
export async function processPayout(payoutId: string): Promise<Payout> {
  const payout = await prisma.payout.findUnique({
    where: { id: payoutId },
    include: {
      professional: {
        include: {
          applications: {
            where: { status: "APPROVED" },
            select: { userId: true },
          },
        },
      },
      cycle: true,
    },
  });

  if (!payout) {
    throw new Error("Payout not found");
  }

  if (payout.status !== "pending") {
    throw new Error(
      `Payout cannot be processed: current status is ${payout.status}`
    );
  }

  // Mark as processing
  await prisma.payout.update({
    where: { id: payoutId },
    data: { status: "processing" },
  });

  try {
    // TODO: Integrate with Stripe here
    // For now, we'll simulate a successful payout

    // Get all confirmed earnings for this payout
    const earnings = await prisma.earning.findMany({
      where: {
        professionalId: payout.professionalId,
        cycleId: payout.cycleId,
        status: "confirmed",
      },
    });

    // Mark earnings as paid
    await markEarningsAsPaid(earnings.map((e) => e.id));

    // Mark payout as completed
    const completedPayout = await prisma.payout.update({
      where: { id: payoutId },
      data: {
        status: "completed",
        processedAt: new Date(),
        // stripePayoutId: "po_xxx", // Will be set when Stripe is integrated
      },
    });

    // Notify professional
    const professionalUserId = payout.professional.applications[0]?.userId;
    if (professionalUserId) {
      const dateRange = formatCycleDateRange(
        payout.cycle.startDate,
        payout.cycle.endDate
      );
      await createPaymentNotification(
        professionalUserId,
        `Your payout of $${payout.netTotal.toFixed(2)} for ${dateRange} has been processed!`,
        payoutId
      );
    }

    return {
      ...completedPayout,
      status: castPayoutStatus(completedPayout.status),
    };
  } catch (error) {
    // Mark as failed
    const failedPayout = await prisma.payout.update({
      where: { id: payoutId },
      data: {
        status: "failed",
        failedReason: error instanceof Error ? error.message : "Unknown error",
      },
    });

    throw error;
  }
}

/**
 * Process all pending payouts for a cycle
 */
export async function processPayoutsForCycle(cycleId: string): Promise<{
  processed: number;
  failed: number;
  errors: string[];
}> {
  const pendingPayouts = await prisma.payout.findMany({
    where: {
      cycleId,
      status: "pending",
    },
  });

  let processed = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const payout of pendingPayouts) {
    try {
      await processPayout(payout.id);
      processed++;
    } catch (error) {
      failed++;
      errors.push(`Payout ${payout.id}: ${error}`);
    }
  }

  // Update cycle status if all payouts processed
  if (failed === 0 && processed > 0) {
    await updateCycleStatus(cycleId, "completed", new Date());
  }

  return { processed, failed, errors };
}

/**
 * Process all cycles ready for payout
 */
export async function processAllReadyCycles(): Promise<{
  cyclesProcessed: number;
  totalPayoutsProcessed: number;
  totalPayoutsFailed: number;
  errors: string[];
}> {
  const readyCycles = await getCyclesReadyForProcessing();

  let cyclesProcessed = 0;
  let totalPayoutsProcessed = 0;
  let totalPayoutsFailed = 0;
  const errors: string[] = [];

  for (const cycle of readyCycles) {
    try {
      // First create payouts for all professionals
      await createPayoutsForCycle(cycle.id);

      // Then process them
      const result = await processPayoutsForCycle(cycle.id);

      totalPayoutsProcessed += result.processed;
      totalPayoutsFailed += result.failed;
      errors.push(...result.errors);

      cyclesProcessed++;
    } catch (error) {
      errors.push(`Cycle ${cycle.id}: ${error}`);
    }
  }

  return {
    cyclesProcessed,
    totalPayoutsProcessed,
    totalPayoutsFailed,
    errors,
  };
}

// ============================================
// PAYOUT STATUS MANAGEMENT
// ============================================

/**
 * Update payout status
 */
export async function updatePayoutStatus(
  payoutId: string,
  status: PayoutStatus,
  additionalData?: {
    stripePayoutId?: string;
    stripeTransferId?: string;
    failedReason?: string;
    processedAt?: Date;
  }
): Promise<Payout> {
  const payout = await prisma.payout.update({
    where: { id: payoutId },
    data: {
      status,
      ...additionalData,
    },
  });

  return {
    ...payout,
    status: castPayoutStatus(payout.status),
  };
}

/**
 * Retry a failed payout
 */
export async function retryPayout(payoutId: string): Promise<Payout> {
  const payout = await prisma.payout.findUnique({
    where: { id: payoutId },
  });

  if (!payout) {
    throw new Error("Payout not found");
  }

  if (payout.status !== "failed") {
    throw new Error("Only failed payouts can be retried");
  }

  // Reset to pending
  await prisma.payout.update({
    where: { id: payoutId },
    data: {
      status: "pending",
      failedReason: null,
    },
  });

  // Process again
  return processPayout(payoutId);
}

// ============================================
// PAYOUT RETRIEVAL
// ============================================

/**
 * Get payout by ID with details
 */
export async function getPayoutById(
  payoutId: string
): Promise<PayoutWithDetails | null> {
  const payout = await prisma.payout.findUnique({
    where: { id: payoutId },
    include: {
      cycle: {
        select: {
          id: true,
          startDate: true,
          endDate: true,
          status: true,
        },
      },
    },
  });

  if (!payout) return null;

  // Get earnings for this payout
  const earnings = await getEarningsForCycle(
    payout.cycleId,
    payout.professionalId
  );

  return {
    ...payout,
    status: castPayoutStatus(payout.status),
    cycle: {
      ...payout.cycle,
      status: castCycleStatus(payout.cycle.status),
    },
    earnings,
  };
}

/**
 * Get payouts for a professional
 */
export async function getPayoutsForProfessional(
  professionalId: string,
  filters?: PayoutHistoryFilters
): Promise<PayoutsResponse> {
  const { startDate, endDate, status, page = 1, limit = 10 } = filters || {};

  const where = {
    professionalId,
    ...(status && { status }),
    ...(startDate || endDate
      ? {
          cycle: {
            ...(startDate && { startDate: { gte: startDate } }),
            ...(endDate && { endDate: { lte: endDate } }),
          },
        }
      : {}),
  };

  const [payouts, total, aggregation] = await Promise.all([
    prisma.payout.findMany({
      where,
      include: {
        cycle: {
          select: {
            id: true,
            startDate: true,
            endDate: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      skip: (page - 1) * limit,
    }),
    prisma.payout.count({ where }),
    prisma.payout.aggregate({
      where: {
        professionalId,
        status: { in: ["completed", "pending"] },
      },
      _sum: {
        netTotal: true,
      },
    }),
  ]);

  const pendingSum = await prisma.payout.aggregate({
    where: {
      professionalId,
      status: "pending",
    },
    _sum: {
      netTotal: true,
    },
  });

  const data: PayoutHistoryItem[] = payouts.map((payout) => ({
    id: payout.id,
    cycleId: payout.cycleId,
    cycleStartDate: payout.cycle.startDate,
    cycleEndDate: payout.cycle.endDate,
    grossTotal: payout.grossTotal,
    platformFeeTotal: payout.platformFeeTotal,
    netTotal: payout.netTotal,
    earningsCount: payout.earningsCount,
    status: castPayoutStatus(payout.status),
    processedAt: payout.processedAt,
  }));

  const completedSum =
    (aggregation._sum.netTotal || 0) - (pendingSum._sum.netTotal || 0);

  return {
    data,
    total,
    page,
    limit,
    hasMore: page * limit < total,
    summary: {
      totalPaid: completedSum,
      totalPending: pendingSum._sum.netTotal || 0,
    },
  };
}

/**
 * Get upcoming payout estimate for a professional
 */
export async function getUpcomingPayoutEstimate(
  professionalId: string
): Promise<{
  estimatedAmount: number;
  estimatedDate: Date;
  sessionsCount: number;
  pendingConfirmations: number;
} | null> {
  // Get current cycle
  const { getOrCreateCurrentCycle } = await import("./cycle.service");
  const currentCycle = await getOrCreateCurrentCycle();

  // Get earnings in current cycle
  const earnings = await prisma.earning.findMany({
    where: {
      professionalId,
      cycleId: currentCycle.id,
      status: { in: ["pending", "confirmed"] },
    },
  });

  if (earnings.length === 0) {
    return null;
  }

  const confirmed = earnings.filter((e) => e.status === "confirmed");
  const pending = earnings.filter((e) => e.status === "pending");

  const estimatedAmount = earnings.reduce((sum, e) => sum + e.netAmount, 0);

  return {
    estimatedAmount,
    estimatedDate: currentCycle.cutoffDate,
    sessionsCount: confirmed.length,
    pendingConfirmations: pending.length,
  };
}

/**
 * Get payout summary for admin
 */
export async function getPayoutSummaryForAdmin(cycleId?: string): Promise<{
  totalPayouts: number;
  pendingPayouts: number;
  processingPayouts: number;
  completedPayouts: number;
  failedPayouts: number;
  totalAmount: number;
  totalPlatformFees: number;
}> {
  const where = cycleId ? { cycleId } : {};

  const [counts, totals] = await Promise.all([
    prisma.payout.groupBy({
      by: ["status"],
      where,
      _count: true,
    }),
    prisma.payout.aggregate({
      where,
      _sum: {
        netTotal: true,
        platformFeeTotal: true,
      },
      _count: true,
    }),
  ]);

  const getCount = (status: string) =>
    counts.find((c) => c.status === status)?._count || 0;

  return {
    totalPayouts: totals._count || 0,
    pendingPayouts: getCount("pending"),
    processingPayouts: getCount("processing"),
    completedPayouts: getCount("completed"),
    failedPayouts: getCount("failed"),
    totalAmount: totals._sum.netTotal || 0,
    totalPlatformFees: totals._sum.platformFeeTotal || 0,
  };
}
