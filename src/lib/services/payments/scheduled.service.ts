// src/lib/services/payments/scheduled.service.ts

/**
 * Scheduled Payment Processing Service
 *
 * This handles:
 * 1. Creating confirmations for completed appointments
 * 2. Sending confirmation reminders
 * 3. Auto-resolving expired confirmations at cycle end
 * 4. Creating fee charges for confirmed earnings
 * 5. Processing fee charges (charging cards)
 * 6. Retrying failed charges daily
 * 7. Checking for expired cards
 * 8. Sending cycle summary emails
 */

import prisma from "@/lib/prisma";
import {
  getOrCreateCurrentCycle,
  getCyclesReadyForAutoConfirm,
  getCyclesReadyForFeeCollection,
  updateCycleStatus,
} from "./cycle.service";
import {
  createConfirmation,
  autoResolveExpiredConfirmations,
} from "./confirmation.service";
import {
  createFeeChargesForCycle,
  processFeeChargesForCycle,
  retryFailedFeeCharges,
} from "./fee-charge.service";
import { checkAndInvalidateExpiredCards } from "./payment-method.service";
import { buildDisplayName } from "@/lib/utils";
import {
  getDaysRemainingInCycle,
  getCycleDates,
} from "@/lib/utils/paymentCycle";
import {
  sendConfirmationNeededEmail,
  sendCycleSummaryEmail,
} from "@/lib/services/email";

export interface ScheduledTaskResult {
  success: boolean;
  timestamp: string;
  duration: number;
  tasks: {
    confirmationsCreated: number;
    confirmationReminders: number;
    confirmationsAutoResolved: number;
    feeChargesCreated: number;
    feeChargesProcessed: number;
    feeChargesFailed: number;
    retriedCharges: number;
    retriedSucceeded: number;
    expiredCardsInvalidated: number;
    cardExpiryWarnings: number;
    cycleSummariesSent: number;
  };
  errors: string[];
}

/**
 * Main scheduled task function - runs all payment processing tasks
 */
export async function runScheduledPaymentProcessing(): Promise<ScheduledTaskResult> {
  const startTime = Date.now();
  const result: ScheduledTaskResult = {
    success: true,
    timestamp: new Date().toISOString(),
    duration: 0,
    tasks: {
      confirmationsCreated: 0,
      confirmationReminders: 0,
      confirmationsAutoResolved: 0,
      feeChargesCreated: 0,
      feeChargesProcessed: 0,
      feeChargesFailed: 0,
      retriedCharges: 0,
      retriedSucceeded: 0,
      expiredCardsInvalidated: 0,
      cardExpiryWarnings: 0,
      cycleSummariesSent: 0,
    },
    errors: [],
  };

  try {
    // Step 1: Check for expired cards
    try {
      const cardResult = await checkAndInvalidateExpiredCards();
      result.tasks.expiredCardsInvalidated = cardResult.invalidated;
      result.tasks.cardExpiryWarnings = cardResult.warned;
    } catch (error) {
      result.errors.push(
        `Expired cards check: ${error instanceof Error ? error.message : "Unknown"}`
      );
    }

    // Step 2: Create confirmations for completed appointments
    const appointmentsNeedingConfirmation = await prisma.appointment.findMany({
      where: {
        status: "completed",
        confirmation: null,
        endTime: { lte: new Date() },
      },
      select: { id: true },
    });

    for (const apt of appointmentsNeedingConfirmation) {
      try {
        await createConfirmation(apt.id);
        result.tasks.confirmationsCreated++;
      } catch (error) {
        result.errors.push(
          `Confirmation for ${apt.id}: ${error instanceof Error ? error.message : "Unknown"}`
        );
      }
    }

    // Step 3: Send confirmation reminders (for pending confirmations)
    try {
      const remindersResult = await sendConfirmationReminders();
      result.tasks.confirmationReminders = remindersResult.sent;
      result.errors.push(...remindersResult.errors);
    } catch (error) {
      result.errors.push(
        `Confirmation reminders: ${error instanceof Error ? error.message : "Unknown"}`
      );
    }

    // Step 4: Auto-resolve expired confirmations for cycles past deadline
    const cyclesForAutoConfirm = await getCyclesReadyForAutoConfirm();

    for (const cycle of cyclesForAutoConfirm) {
      try {
        // Update cycle status to confirming
        await updateCycleStatus(cycle.id, "confirming", {
          autoConfirmRanAt: new Date(),
        });

        const autoResult = await autoResolveExpiredConfirmations(cycle.id);
        result.tasks.confirmationsAutoResolved += autoResult.resolved;
        result.errors.push(...autoResult.errors);
      } catch (error) {
        result.errors.push(
          `Auto-confirm for cycle ${cycle.id}: ${error instanceof Error ? error.message : "Unknown"}`
        );
      }
    }

    // Step 5: Create fee charges for cycles ready for collection
    const cyclesForFeeCollection = await getCyclesReadyForFeeCollection();

    for (const cycle of cyclesForFeeCollection) {
      try {
        // Update cycle status to processing
        await updateCycleStatus(cycle.id, "processing", {
          feeCollectionRanAt: new Date(),
        });

        const chargeResult = await createFeeChargesForCycle(cycle.id);
        result.tasks.feeChargesCreated += chargeResult.created;
        result.errors.push(...chargeResult.errors);

        // Send cycle summary emails to professionals
        const summaryResult = await sendCycleSummaryEmails(cycle.id);
        result.tasks.cycleSummariesSent += summaryResult.sent;
        result.errors.push(...summaryResult.errors);
      } catch (error) {
        result.errors.push(
          `Fee charge creation for cycle ${cycle.id}: ${error instanceof Error ? error.message : "Unknown"}`
        );
      }
    }

    // Step 6: Process pending fee charges
    const cyclesWithPendingCharges = await prisma.payoutCycle.findMany({
      where: {
        status: "processing",
        feeCharges: {
          some: { status: "pending" },
        },
      },
    });

    for (const cycle of cyclesWithPendingCharges) {
      try {
        const processResult = await processFeeChargesForCycle(cycle.id);
        result.tasks.feeChargesProcessed += processResult.processed;
        result.tasks.feeChargesFailed += processResult.failed;
        result.errors.push(...processResult.errors);
      } catch (error) {
        result.errors.push(
          `Fee charge processing for cycle ${cycle.id}: ${error instanceof Error ? error.message : "Unknown"}`
        );
      }
    }

    // Step 7: Retry failed charges
    try {
      const retryResult = await retryFailedFeeCharges();
      result.tasks.retriedCharges = retryResult.retried;
      result.tasks.retriedSucceeded = retryResult.succeeded;
      result.errors.push(...retryResult.errors);
    } catch (error) {
      result.errors.push(
        `Retry failed charges: ${error instanceof Error ? error.message : "Unknown"}`
      );
    }

    // Step 8: Ensure current cycle exists
    await getOrCreateCurrentCycle();

    result.duration = Date.now() - startTime;
    result.success = result.errors.length === 0;

    return result;
  } catch (error) {
    result.success = false;
    result.duration = Date.now() - startTime;
    result.errors.push(error instanceof Error ? error.message : "Fatal error");
    return result;
  }
}

/**
 * Send confirmation reminders to users who haven't confirmed yet
 * Sends reminders when:
 * - 3 days remaining in cycle
 * - 1 day remaining in cycle (urgent)
 */
async function sendConfirmationReminders(): Promise<{
  sent: number;
  errors: string[];
}> {
  const daysRemaining = getDaysRemainingInCycle();
  const errors: string[] = [];
  let sent = 0;

  // Only send reminders at 3 days and 1 day remaining
  if (daysRemaining !== 3 && daysRemaining !== 1) {
    return { sent: 0, errors: [] };
  }

  const cycleDates = getCycleDates();

  // Get pending confirmations for the current cycle
  const pendingConfirmations = await prisma.appointmentConfirmation.findMany({
    where: {
      finalStatus: "pending",
      appointment: {
        endTime: {
          gte: cycleDates.startDate,
          lte: cycleDates.endDate,
        },
      },
    },
    include: {
      appointment: {
        select: {
          id: true,
          endTime: true,
        },
      },
      client: {
        select: {
          id: true,
          email: true,
          name: true,
          firstName: true,
          lastName: true,
        },
      },
      professionalUser: {
        select: {
          id: true,
          email: true,
          name: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  for (const confirmation of pendingConfirmations) {
    const sessionDate = confirmation.appointment.endTime.toLocaleDateString(
      "en-US",
      {
        weekday: "long",
        month: "long",
        day: "numeric",
      }
    );

    const clientName = buildDisplayName(confirmation.client);
    const professionalName = buildDisplayName(confirmation.professionalUser);

    // Send reminder to client if they haven't confirmed
    if (confirmation.clientConfirmed === null && confirmation.client.email) {
      try {
        await sendConfirmationNeededEmail(
          confirmation.client.email,
          clientName,
          professionalName,
          sessionDate,
          daysRemaining,
          confirmation.appointmentId,
          false // isRecipientProfessional
        );
        sent++;
      } catch (error) {
        errors.push(
          `Client reminder for ${confirmation.id}: ${error instanceof Error ? error.message : "Unknown"}`
        );
      }
    }

    // Send reminder to professional if they haven't confirmed
    if (
      confirmation.professionalConfirmed === null &&
      confirmation.professionalUser.email
    ) {
      try {
        await sendConfirmationNeededEmail(
          confirmation.professionalUser.email,
          professionalName,
          clientName,
          sessionDate,
          daysRemaining,
          confirmation.appointmentId,
          true // isRecipientProfessional
        );
        sent++;
      } catch (error) {
        errors.push(
          `Professional reminder for ${confirmation.id}: ${error instanceof Error ? error.message : "Unknown"}`
        );
      }
    }
  }

  return { sent, errors };
}

/**
 * Send cycle summary emails to all professionals with earnings in a cycle
 */
async function sendCycleSummaryEmails(cycleId: string): Promise<{
  sent: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let sent = 0;

  const cycle = await prisma.payoutCycle.findUnique({
    where: { id: cycleId },
  });

  if (!cycle) {
    return { sent: 0, errors: ["Cycle not found"] };
  }

  // Get all professionals with confirmed earnings in this cycle
  const professionalsWithEarnings = await prisma.earning.groupBy({
    by: ["professionalId"],
    where: {
      cycleId,
      status: "confirmed",
    },
    _sum: {
      grossAmount: true,
      platformFeeAmount: true,
    },
    _count: true,
  });

  for (const earningGroup of professionalsWithEarnings) {
    try {
      // Get professional details
      const professional = await prisma.professional.findUnique({
        where: { id: earningGroup.professionalId },
        include: {
          applications: {
            where: { status: "APPROVED" },
            include: {
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

      if (!professional) continue;

      const professionalUser = professional.applications[0]?.user;
      if (!professionalUser?.email) continue;

      const professionalName = buildDisplayName(professionalUser);
      const totalEarnings = earningGroup._sum.grossAmount || 0;
      const platformFee = earningGroup._sum.platformFeeAmount || 0;
      const sessionsCount = earningGroup._count || 0;

      // Get platform fee percent (use professional's custom rate or default)
      const platformFeePercent =
        professional.companyCutPercentage?.toString() || "20";

      await sendCycleSummaryEmail(
        professionalUser.email,
        professionalName,
        cycle.startDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        cycle.endDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        totalEarnings.toFixed(2),
        platformFee.toFixed(2),
        platformFeePercent,
        sessionsCount
      );

      sent++;
    } catch (error) {
      errors.push(
        `Cycle summary for professional ${earningGroup.professionalId}: ${error instanceof Error ? error.message : "Unknown"}`
      );
    }
  }

  return { sent, errors };
}

/**
 * Run only the auto-confirm task (for cycle end)
 */
export async function runAutoConfirmTask(): Promise<{
  success: boolean;
  cyclesProcessed: number;
  confirmationsResolved: number;
  errors: string[];
}> {
  const cyclesForAutoConfirm = await getCyclesReadyForAutoConfirm();

  let confirmationsResolved = 0;
  const errors: string[] = [];

  for (const cycle of cyclesForAutoConfirm) {
    try {
      await updateCycleStatus(cycle.id, "confirming", {
        autoConfirmRanAt: new Date(),
      });

      const result = await autoResolveExpiredConfirmations(cycle.id);
      confirmationsResolved += result.resolved;
      errors.push(...result.errors);
    } catch (error) {
      errors.push(
        `Cycle ${cycle.id}: ${error instanceof Error ? error.message : "Unknown"}`
      );
    }
  }

  return {
    success: errors.length === 0,
    cyclesProcessed: cyclesForAutoConfirm.length,
    confirmationsResolved,
    errors,
  };
}

/**
 * Run only the fee collection task (admin triggered)
 */
export async function runFeeCollectionTask(cycleId?: string): Promise<{
  success: boolean;
  chargesCreated: number;
  chargesProcessed: number;
  chargesFailed: number;
  totalCollected: number;
  summariesSent: number;
  errors: string[];
}> {
  let chargesCreated = 0;
  let chargesProcessed = 0;
  let chargesFailed = 0;
  let totalCollected = 0;
  let summariesSent = 0;
  const errors: string[] = [];

  const cycles = cycleId
    ? [await prisma.payoutCycle.findUnique({ where: { id: cycleId } })]
    : await getCyclesReadyForFeeCollection();

  for (const cycle of cycles) {
    if (!cycle) continue;

    try {
      // Update status if not already processing
      if (cycle.status !== "processing") {
        await updateCycleStatus(cycle.id, "processing", {
          feeCollectionRanAt: new Date(),
        });
      }

      // Create fee charges
      const createResult = await createFeeChargesForCycle(cycle.id);
      chargesCreated += createResult.created;
      errors.push(...createResult.errors);

      // Send cycle summary emails
      const summaryResult = await sendCycleSummaryEmails(cycle.id);
      summariesSent += summaryResult.sent;
      errors.push(...summaryResult.errors);

      // Process fee charges
      const processResult = await processFeeChargesForCycle(cycle.id);
      chargesProcessed += processResult.processed;
      chargesFailed += processResult.failed;
      totalCollected += processResult.totalCharged;
      errors.push(...processResult.errors);
    } catch (error) {
      errors.push(
        `Cycle ${cycle.id}: ${error instanceof Error ? error.message : "Unknown"}`
      );
    }
  }

  return {
    success: errors.length === 0,
    chargesCreated,
    chargesProcessed,
    chargesFailed,
    totalCollected,
    summariesSent,
    errors,
  };
}

/**
 * Run only the reminder task
 */
export async function runReminderTask(): Promise<{
  success: boolean;
  remindersSent: number;
  errors: string[];
}> {
  try {
    const result = await sendConfirmationReminders();
    return {
      success: result.errors.length === 0,
      remindersSent: result.sent,
      errors: result.errors,
    };
  } catch (error) {
    return {
      success: false,
      remindersSent: 0,
      errors: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}

/**
 * Check system health for scheduled tasks
 */
export async function checkPaymentSystemHealth(): Promise<{
  healthy: boolean;
  checks: {
    database: boolean;
    currentCycle: boolean;
    pendingConfirmations: number;
    pendingFeeCharges: number;
    failedFeeCharges: number;
    blockedProfessionals: number;
    expiringCards: number;
  };
}> {
  try {
    // Check database connection
    await prisma.user.findFirst({ select: { id: true } });

    // Check current cycle
    const cycle = await getOrCreateCurrentCycle();

    // Count pending items
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [
      pendingConfirmations,
      pendingFeeCharges,
      failedFeeCharges,
      blockedProfessionals,
      expiringCards,
    ] = await Promise.all([
      prisma.appointmentConfirmation.count({
        where: { finalStatus: "pending" },
      }),
      prisma.feeCharge.count({
        where: { status: "pending" },
      }),
      prisma.feeCharge.count({
        where: { status: "failed" },
      }),
      prisma.professional.count({
        where: { paymentBlockedAt: { not: null } },
      }),
      prisma.professional.count({
        where: {
          hasValidPaymentMethod: true,
          cardExpiryYear: nextMonth.getFullYear(),
          cardExpiryMonth: nextMonth.getMonth() + 1,
        },
      }),
    ]);

    return {
      healthy: true,
      checks: {
        database: true,
        currentCycle: !!cycle,
        pendingConfirmations,
        pendingFeeCharges,
        failedFeeCharges,
        blockedProfessionals,
        expiringCards,
      },
    };
  } catch {
    return {
      healthy: false,
      checks: {
        database: false,
        currentCycle: false,
        pendingConfirmations: 0,
        pendingFeeCharges: 0,
        failedFeeCharges: 0,
        blockedProfessionals: 0,
        expiringCards: 0,
      },
    };
  }
}
