// src/lib/services/payments/fee-charge.service.ts

import prisma from "@/lib/prisma";
import {
  FeeCharge,
  FeeChargeWithDetails,
  FeeChargeHistoryFilters,
  FeeChargesResponse,
  EarningStatus,
} from "@/types/payments";
import { updateCycleStatus } from "./cycle.service";
import { markEarningsCharged } from "./earnings.service";
import { createPaymentNotification } from "@/lib/notifications";
import { formatCycleDateRange } from "@/lib/utils/paymentCycle";
import {
  castFeeChargeStatus,
  castCycleStatus,
  getNextRetryDate,
  formatCurrency,
} from "./helpers";
import { buildDisplayName } from "@/lib/utils";
import {
  sendFeeChargedEmail,
  sendFeeChargeFailedEmail,
  sendAccountBlockedEmail,
  sendAccountUnblockedEmail,
  sendFeeWaivedEmail,
} from "@/lib/services/email";

// ============================================
// FEE CHARGE CREATION
// ============================================

/**
 * Create a fee charge record for a professional for a specific cycle
 */
export async function createFeeCharge(
  professionalId: string,
  cycleId: string
): Promise<FeeCharge | null> {
  // Check if fee charge already exists
  const existingCharge = await prisma.feeCharge.findUnique({
    where: {
      professionalId_cycleId: {
        professionalId,
        cycleId,
      },
    },
  });

  if (existingCharge) {
    return {
      ...existingCharge,
      status: castFeeChargeStatus(existingCharge.status),
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
    return null; // No earnings to charge for
  }

  // Calculate totals
  const totals = earnings.reduce(
    (acc, earning) => ({
      gross: acc.gross + earning.grossAmount,
      platformFee: acc.platformFee + earning.platformFeeAmount,
    }),
    { gross: 0, platformFee: 0 }
  );

  // Get the platform fee percentage (use the first earning's rate as they should all be the same)
  const platformFeePercent = earnings[0].platformFeePercent;

  // Create fee charge
  const feeCharge = await prisma.feeCharge.create({
    data: {
      professionalId,
      cycleId,
      totalGrossEarnings: totals.gross,
      platformFeePercent,
      amountToCharge: totals.platformFee,
      earningsCount: earnings.length,
      status: "pending",
    },
  });

  return {
    ...feeCharge,
    status: castFeeChargeStatus(feeCharge.status),
  };
}

/**
 * Create fee charges for all professionals with confirmed earnings in a cycle
 */
export async function createFeeChargesForCycle(cycleId: string): Promise<{
  created: number;
  skipped: number;
  totalAmount: number;
  errors: string[];
}> {
  // Get all professionals with confirmed earnings in this cycle
  const professionalsWithEarnings = await prisma.earning.groupBy({
    by: ["professionalId"],
    where: {
      cycleId,
      status: "confirmed",
    },
    _sum: {
      platformFeeAmount: true,
    },
  });

  let created = 0;
  let skipped = 0;
  let totalAmount = 0;
  const errors: string[] = [];

  for (const { professionalId } of professionalsWithEarnings) {
    try {
      const feeCharge = await createFeeCharge(professionalId, cycleId);
      if (feeCharge) {
        created++;
        totalAmount += feeCharge.amountToCharge;
      } else {
        skipped++;
      }
    } catch (error) {
      errors.push(
        `Failed to create fee charge for professional ${professionalId}: ${error}`
      );
    }
  }

  return { created, skipped, totalAmount, errors };
}

// ============================================
// FEE CHARGE PROCESSING
// ============================================

/**
 * Process a single fee charge (charge the professional's card)
 */
export async function processFeeCharge(
  feeChargeId: string
): Promise<FeeCharge> {
  const feeCharge = await prisma.feeCharge.findUnique({
    where: { id: feeChargeId },
    include: {
      professional: {
        include: {
          applications: {
            where: { status: "APPROVED" },
            select: {
              userId: true,
              user: {
                select: {
                  email: true,
                  name: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      },
      cycle: true,
    },
  });

  if (!feeCharge) {
    throw new Error("Fee charge not found");
  }

  if (feeCharge.status === "completed") {
    throw new Error("Fee charge has already been processed");
  }

  if (feeCharge.status === "waived") {
    throw new Error("Fee charge has been waived");
  }

  const professionalUser = feeCharge.professional.applications[0]?.user;
  const professionalName = professionalUser
    ? buildDisplayName(professionalUser)
    : feeCharge.professional.name;
  const professionalEmail = professionalUser?.email;

  // Check if professional has a valid payment method
  if (!feeCharge.professional.hasValidPaymentMethod) {
    // Block the professional and mark charge as failed
    await prisma.$transaction([
      prisma.professional.update({
        where: { id: feeCharge.professionalId },
        data: {
          paymentBlockedAt: new Date(),
          paymentBlockReason: "No valid payment method on file",
        },
      }),
      prisma.feeCharge.update({
        where: { id: feeChargeId },
        data: {
          status: "failed",
          attemptCount: { increment: 1 },
          lastAttemptAt: new Date(),
          nextRetryAt: getNextRetryDate(),
          failureCode: "no_payment_method",
          failureMessage: "No valid payment method on file",
        },
      }),
    ]);

    // Send account blocked email
    if (professionalEmail) {
      try {
        await sendAccountBlockedEmail(
          professionalEmail,
          professionalName,
          feeCharge.amountToCharge.toFixed(2),
          "No valid payment method on file"
        );
      } catch (emailError) {
        console.error("Failed to send account blocked email:", emailError);
      }
    }

    throw new Error("Professional has no valid payment method");
  }

  // Mark as processing
  await prisma.feeCharge.update({
    where: { id: feeChargeId },
    data: { status: "processing" },
  });

  try {
    // TODO: Integrate with Stripe to charge the card
    // For now, simulate a successful charge
    const stripeResult = await chargeStripeCard(
      feeCharge.professional.stripeCustomerId!,
      feeCharge.professional.stripePaymentMethodId!,
      feeCharge.amountToCharge
    );

    if (!stripeResult.success) {
      throw new Error(stripeResult.error || "Charge failed");
    }

    // Get all confirmed earnings for this fee charge
    const earnings = await prisma.earning.findMany({
      where: {
        professionalId: feeCharge.professionalId,
        cycleId: feeCharge.cycleId,
        status: "confirmed",
      },
    });

    // Mark earnings as charged
    await markEarningsCharged(
      earnings.map((e) => e.id),
      feeChargeId
    );

    // Mark fee charge as completed
    const completedCharge = await prisma.feeCharge.update({
      where: { id: feeChargeId },
      data: {
        status: "completed",
        stripePaymentIntentId: stripeResult.paymentIntentId,
        stripeChargeId: stripeResult.chargeId,
        chargedAt: new Date(),
        chargedAmount: feeCharge.amountToCharge,
        attemptCount: { increment: 1 },
        lastAttemptAt: new Date(),
      },
    });

    // Clear any payment blocks
    await prisma.professional.update({
      where: { id: feeCharge.professionalId },
      data: {
        paymentBlockedAt: null,
        paymentBlockReason: null,
      },
    });

    const dateRange = formatCycleDateRange(
      feeCharge.cycle.startDate,
      feeCharge.cycle.endDate
    );

    // Notify professional
    const professionalUserId = feeCharge.professional.applications[0]?.userId;
    if (professionalUserId) {
      await createPaymentNotification(
        professionalUserId,
        `Platform fee of ${formatCurrency(feeCharge.amountToCharge)} for ${dateRange} has been charged.`,
        feeChargeId
      );
    }

    // Send email
    if (professionalEmail) {
      try {
        await sendFeeChargedEmail(
          professionalEmail,
          professionalName,
          feeCharge.amountToCharge.toFixed(2),
          feeCharge.earningsCount,
          feeCharge.cycle.startDate.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          feeCharge.cycle.endDate.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
          feeCharge.professional.cardLast4 || "****"
        );
      } catch (emailError) {
        console.error("Failed to send fee charged email:", emailError);
      }
    }

    return {
      ...completedCharge,
      status: castFeeChargeStatus(completedCharge.status),
    };
  } catch (error) {
    // Mark as failed and schedule retry
    const failedCharge = await prisma.feeCharge.update({
      where: { id: feeChargeId },
      data: {
        status: "failed",
        attemptCount: { increment: 1 },
        lastAttemptAt: new Date(),
        nextRetryAt: getNextRetryDate(),
        failureCode: error instanceof Error ? "charge_failed" : "unknown",
        failureMessage:
          error instanceof Error ? error.message : "Unknown error",
      },
    });

    // Send failure email
    if (professionalEmail) {
      try {
        await sendFeeChargeFailedEmail(
          professionalEmail,
          professionalName,
          feeCharge.amountToCharge.toFixed(2),
          error instanceof Error ? error.message : "Payment processing failed"
        );
      } catch (emailError) {
        console.error("Failed to send fee charge failed email:", emailError);
      }
    }

    // Block professional if this is a repeated failure
    if (failedCharge.attemptCount >= 3) {
      await prisma.professional.update({
        where: { id: feeCharge.professionalId },
        data: {
          paymentBlockedAt: new Date(),
          paymentBlockReason: `Payment failed ${failedCharge.attemptCount} times: ${failedCharge.failureMessage}`,
        },
      });

      // Send account blocked email
      if (professionalEmail) {
        try {
          await sendAccountBlockedEmail(
            professionalEmail,
            professionalName,
            feeCharge.amountToCharge.toFixed(2),
            `Payment failed ${failedCharge.attemptCount} times`
          );
        } catch (emailError) {
          console.error("Failed to send account blocked email:", emailError);
        }
      }
    }

    throw error;
  }
}

/**
 * Stripe card charging function (placeholder for actual Stripe integration)
 */
async function chargeStripeCard(
  customerId: string,
  paymentMethodId: string,
  amount: number
): Promise<{
  success: boolean;
  paymentIntentId?: string;
  chargeId?: string;
  error?: string;
}> {
  // TODO: Implement actual Stripe charging
  console.log("[STRIPE] chargeStripeCard called (simulated)", {
    customerId,
    paymentMethodId,
    amount,
  });

  // Simulate successful charge for now
  return {
    success: true,
    paymentIntentId: `pi_simulated_${Date.now()}`,
    chargeId: `ch_simulated_${Date.now()}`,
  };
}

/**
 * Process all pending fee charges for a cycle
 */
export async function processFeeChargesForCycle(cycleId: string): Promise<{
  processed: number;
  failed: number;
  totalCharged: number;
  errors: string[];
}> {
  const pendingCharges = await prisma.feeCharge.findMany({
    where: {
      cycleId,
      status: "pending",
    },
  });

  let processed = 0;
  let failed = 0;
  let totalCharged = 0;
  const errors: string[] = [];

  for (const charge of pendingCharges) {
    try {
      const result = await processFeeCharge(charge.id);
      processed++;
      totalCharged += result.chargedAmount || 0;
    } catch (error) {
      failed++;
      errors.push(`Fee charge ${charge.id}: ${error}`);
    }
  }

  // Update cycle status if all charges processed
  if (failed === 0 && processed > 0) {
    await updateCycleStatus(cycleId, "completed", {
      completedAt: new Date(),
    });
  }

  return { processed, failed, totalCharged, errors };
}

/**
 * Retry failed fee charges
 */
export async function retryFailedFeeCharges(): Promise<{
  retried: number;
  succeeded: number;
  failed: number;
  errors: string[];
}> {
  const now = new Date();

  // Get failed charges that are due for retry
  const failedCharges = await prisma.feeCharge.findMany({
    where: {
      status: "failed",
      nextRetryAt: { lte: now },
    },
  });

  let retried = 0;
  let succeeded = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const charge of failedCharges) {
    retried++;
    try {
      await processFeeCharge(charge.id);
      succeeded++;
    } catch (error) {
      failed++;
      errors.push(`Fee charge ${charge.id}: ${error}`);
    }
  }

  return { retried, succeeded, failed, errors };
}

// ============================================
// FEE CHARGE MANAGEMENT
// ============================================

/**
 * Waive a fee charge (admin action)
 */
export async function waiveFeeCharge(
  feeChargeId: string,
  adminUserId: string,
  reason: string
): Promise<FeeCharge> {
  const feeCharge = await prisma.feeCharge.findUnique({
    where: { id: feeChargeId },
    include: {
      professional: {
        include: {
          applications: {
            where: { status: "APPROVED" },
            select: {
              userId: true,
              user: {
                select: {
                  email: true,
                  name: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      },
      cycle: true,
    },
  });

  if (!feeCharge) {
    throw new Error("Fee charge not found");
  }

  if (feeCharge.status === "completed") {
    throw new Error("Cannot waive a completed charge");
  }

  // Update fee charge
  const waivedCharge = await prisma.feeCharge.update({
    where: { id: feeChargeId },
    data: {
      status: "waived",
      waivedAt: new Date(),
      waivedBy: adminUserId,
      waivedReason: reason,
    },
  });

  // Update associated earnings to waived status
  await prisma.earning.updateMany({
    where: {
      professionalId: feeCharge.professionalId,
      cycleId: feeCharge.cycleId,
      status: "confirmed",
    },
    data: {
      status: "waived",
      feeChargeId: feeChargeId,
    },
  });

  // Clear any payment blocks
  const wasBlocked = !!feeCharge.professional.paymentBlockedAt;
  await prisma.professional.update({
    where: { id: feeCharge.professionalId },
    data: {
      paymentBlockedAt: null,
      paymentBlockReason: null,
    },
  });

  const professionalUser = feeCharge.professional.applications[0]?.user;
  const professionalName = professionalUser
    ? buildDisplayName(professionalUser)
    : feeCharge.professional.name;
  const professionalEmail = professionalUser?.email;

  const dateRange = formatCycleDateRange(
    feeCharge.cycle.startDate,
    feeCharge.cycle.endDate
  );

  // Notify professional
  const professionalUserId = feeCharge.professional.applications[0]?.userId;
  if (professionalUserId) {
    await createPaymentNotification(
      professionalUserId,
      `Your platform fee of ${formatCurrency(feeCharge.amountToCharge)} for ${dateRange} has been waived.`,
      feeChargeId
    );
  }

  // Send email
  if (professionalEmail) {
    try {
      await sendFeeWaivedEmail(
        professionalEmail,
        professionalName,
        feeCharge.amountToCharge.toFixed(2),
        feeCharge.cycle.startDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        feeCharge.cycle.endDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        reason
      );
    } catch (emailError) {
      console.error("Failed to send fee waived email:", emailError);
    }

    // If they were blocked, send unblocked email
    if (wasBlocked) {
      try {
        await sendAccountUnblockedEmail(professionalEmail, professionalName);
      } catch (emailError) {
        console.error("Failed to send account unblocked email:", emailError);
      }
    }
  }

  return {
    ...waivedCharge,
    status: castFeeChargeStatus(waivedCharge.status),
  };
}

/**
 * Unblock a professional (admin action)
 */
export async function unblockProfessional(
  professionalId: string
): Promise<void> {
  const professional = await prisma.professional.findUnique({
    where: { id: professionalId },
    include: {
      applications: {
        where: { status: "APPROVED" },
        select: {
          userId: true,
          user: {
            select: {
              email: true,
              name: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
    },
  });

  if (!professional) {
    throw new Error("Professional not found");
  }

  await prisma.professional.update({
    where: { id: professionalId },
    data: {
      paymentBlockedAt: null,
      paymentBlockReason: null,
    },
  });

  const professionalUser = professional.applications[0]?.user;
  const professionalEmail = professionalUser?.email;
  const professionalName = professionalUser
    ? buildDisplayName(professionalUser)
    : professional.name;

  // Send email notification
  if (professionalEmail) {
    try {
      await sendAccountUnblockedEmail(professionalEmail, professionalName);
    } catch (emailError) {
      console.error("Failed to send account unblocked email:", emailError);
    }
  }
}

// ============================================
// FEE CHARGE RETRIEVAL
// ============================================

/**
 * Get fee charge by ID with details
 */
export async function getFeeChargeById(
  feeChargeId: string
): Promise<FeeChargeWithDetails | null> {
  const feeCharge = await prisma.feeCharge.findUnique({
    where: { id: feeChargeId },
    include: {
      professional: {
        select: {
          id: true,
          name: true,
          cardLast4: true,
          cardBrand: true,
          hasValidPaymentMethod: true,
        },
      },
      cycle: {
        select: {
          id: true,
          startDate: true,
          endDate: true,
          status: true,
        },
      },
      earnings: true,
    },
  });

  if (!feeCharge) return null;

  return {
    ...feeCharge,
    status: castFeeChargeStatus(feeCharge.status),
    cycle: {
      ...feeCharge.cycle,
      status: castCycleStatus(feeCharge.cycle.status),
    },
    // Add netAmount to each earning
    earnings: feeCharge.earnings.map((e) => ({
      ...e,
      status: e.status as EarningStatus,
      netAmount: e.grossAmount - e.platformFeeAmount, // ← Add this computed field
    })),
  };
}

/**
 * Get fee charges for a professional
 */
export async function getFeeChargesForProfessional(
  professionalId: string,
  filters?: FeeChargeHistoryFilters
): Promise<FeeChargesResponse> {
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

  const [feeCharges, total, aggregations] = await Promise.all([
    prisma.feeCharge.findMany({
      where,
      include: {
        professional: {
          select: {
            id: true,
            name: true,
            cardLast4: true,
            cardBrand: true,
            hasValidPaymentMethod: true,
          },
        },
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
    prisma.feeCharge.count({ where }),
    prisma.feeCharge.groupBy({
      by: ["status"],
      where: { professionalId },
      _sum: {
        amountToCharge: true,
        chargedAmount: true,
      },
    }),
  ]);

  const getSum = (status: string, field: "amountToCharge" | "chargedAmount") =>
    aggregations.find((a) => a.status === status)?._sum[field] || 0;

  const data: FeeChargeWithDetails[] = feeCharges.map((fc) => ({
    ...fc,
    status: castFeeChargeStatus(fc.status),
    cycle: {
      ...fc.cycle,
      status: castCycleStatus(fc.cycle.status),
    },
    earnings: [],
  }));

  return {
    data,
    total,
    page,
    limit,
    hasMore: page * limit < total,
    summary: {
      totalCharged: getSum("completed", "chargedAmount"),
      totalPending: getSum("pending", "amountToCharge"),
      totalFailed: getSum("failed", "amountToCharge"),
      totalWaived: getSum("waived", "amountToCharge"),
    },
  };
}

/**
 * Get pending fee total for a professional
 */
export async function getPendingFeeTotal(professionalId: string): Promise<{
  amount: number;
  cycleCount: number;
}> {
  const result = await prisma.feeCharge.aggregate({
    where: {
      professionalId,
      status: { in: ["pending", "failed"] },
    },
    _sum: {
      amountToCharge: true,
    },
    _count: true,
  });

  return {
    amount: result._sum.amountToCharge || 0,
    cycleCount: result._count || 0,
  };
}

/**
 * Get fee charge summary for admin dashboard
 */
export async function getFeeChargeSummaryForAdmin(cycleId?: string): Promise<{
  totalCharges: number;
  pendingCharges: number;
  processingCharges: number;
  completedCharges: number;
  failedCharges: number;
  waivedCharges: number;
  totalAmountToCharge: number;
  totalAmountCharged: number;
  totalAmountWaived: number;
}> {
  const where = cycleId ? { cycleId } : {};

  const [counts, totals] = await Promise.all([
    prisma.feeCharge.groupBy({
      by: ["status"],
      where,
      _count: true,
      _sum: {
        amountToCharge: true,
        chargedAmount: true,
      },
    }),
    prisma.feeCharge.aggregate({
      where,
      _count: true,
    }),
  ]);

  const getCount = (status: string) =>
    counts.find((c) => c.status === status)?._count || 0;
  const getSum = (status: string, field: "amountToCharge" | "chargedAmount") =>
    counts.find((c) => c.status === status)?._sum[field] || 0;

  return {
    totalCharges: totals._count || 0,
    pendingCharges: getCount("pending"),
    processingCharges: getCount("processing"),
    completedCharges: getCount("completed"),
    failedCharges: getCount("failed"),
    waivedCharges: getCount("waived"),
    totalAmountToCharge: counts.reduce(
      (sum, c) => sum + (c._sum.amountToCharge || 0),
      0
    ),
    totalAmountCharged: getSum("completed", "chargedAmount"),
    totalAmountWaived: getSum("waived", "amountToCharge"),
  };
}

/**
 * Get blocked professionals
 */
export async function getBlockedProfessionals(): Promise<
  Array<{
    id: string;
    name: string;
    blockedAt: Date;
    reason: string;
    pendingFees: number;
  }>
> {
  const blockedPros = await prisma.professional.findMany({
    where: {
      paymentBlockedAt: { not: null },
    },
    select: {
      id: true,
      name: true,
      paymentBlockedAt: true,
      paymentBlockReason: true,
      feeCharges: {
        where: {
          status: { in: ["pending", "failed"] },
        },
        select: {
          amountToCharge: true,
        },
      },
    },
  });

  return blockedPros.map((pro) => ({
    id: pro.id,
    name: pro.name,
    blockedAt: pro.paymentBlockedAt!,
    reason: pro.paymentBlockReason || "Unknown",
    pendingFees: pro.feeCharges.reduce((sum, fc) => sum + fc.amountToCharge, 0),
  }));
}
