// src/lib/services/payments/scheduled.service.ts

/**
 * Scheduled Payment Processing Service
 */

import prisma from "@/lib/prisma";
import {
  processAllReadyCycles,
  getOrCreateCurrentCycle,
} from "@/lib/services/payments";
import { createConfirmation } from "./confirmation.service";

export interface ScheduledTaskResult {
  success: boolean;
  timestamp: string;
  duration: number;
  appointmentsProcessed: number;
  confirmationsCreated: number;
  cyclesProcessed: number;
  payoutsProcessed: number;
  payoutsFailed: number;
  errors: string[];
}

/**
 * Main scheduled task function
 * Can be called from cron endpoint or manually from admin panel
 */
export async function runScheduledPaymentProcessing(): Promise<ScheduledTaskResult> {
  const startTime = Date.now();
  const result: ScheduledTaskResult = {
    success: true,
    timestamp: new Date().toISOString(),
    duration: 0,
    appointmentsProcessed: 0,
    confirmationsCreated: 0,
    cyclesProcessed: 0,
    payoutsProcessed: 0,
    payoutsFailed: 0,
    errors: [],
  };

  try {
    // Step 1: Find completed appointments without confirmations
    const appointmentsNeedingConfirmation = await prisma.appointment.findMany({
      where: {
        status: "completed",
        confirmation: null,
        endTime: { lte: new Date() },
      },
      select: { id: true },
    });

    result.appointmentsProcessed = appointmentsNeedingConfirmation.length;

    // Step 2: Create confirmations
    for (const apt of appointmentsNeedingConfirmation) {
      try {
        await createConfirmation(apt.id);
        result.confirmationsCreated++;
      } catch (error) {
        result.errors.push(
          `Confirmation for ${apt.id}: ${error instanceof Error ? error.message : "Unknown"}`
        );
      }
    }

    // Step 3: Process payouts
    const payoutResult = await processAllReadyCycles();
    result.cyclesProcessed = payoutResult.cyclesProcessed;
    result.payoutsProcessed = payoutResult.totalPayoutsProcessed;
    result.payoutsFailed = payoutResult.totalPayoutsFailed;
    result.errors.push(...payoutResult.errors);

    // Step 4: Ensure current cycle exists
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
 * Check system health for scheduled tasks
 */
export async function checkPaymentSystemHealth(): Promise<{
  healthy: boolean;
  checks: {
    database: boolean;
    currentCycle: boolean;
    pendingConfirmations: number;
    pendingPayouts: number;
  };
}> {
  try {
    // Check database connection using findFirst instead of $queryRaw
    await prisma.user.findFirst({ select: { id: true } });

    // Check current cycle
    const cycle = await getOrCreateCurrentCycle();

    // Count pending items
    const [pendingConfirmations, pendingPayouts] = await Promise.all([
      prisma.appointmentConfirmation.count({
        where: { finalStatus: "pending" },
      }),
      prisma.payout.count({
        where: { status: "pending" },
      }),
    ]);

    return {
      healthy: true,
      checks: {
        database: true,
        currentCycle: !!cycle,
        pendingConfirmations,
        pendingPayouts,
      },
    };
  } catch {
    return {
      healthy: false,
      checks: {
        database: false,
        currentCycle: false,
        pendingConfirmations: 0,
        pendingPayouts: 0,
      },
    };
  }
}
