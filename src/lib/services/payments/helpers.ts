// src/lib/services/payments/helpers.ts

import {
  CycleStatus,
  EarningStatus,
  PayoutStatus,
  ConfirmationFinalStatus,
  DisputeResolution,
  PayoutCycle,
  Earning,
  Payout,
  AppointmentConfirmation,
} from "@/types/payments";

/**
 * Type casting helpers for Prisma results
 * Prisma returns status as string, but we need typed status values
 */

export function castCycleStatus(status: string): CycleStatus {
  return status as CycleStatus;
}

export function castEarningStatus(status: string): EarningStatus {
  return status as EarningStatus;
}

export function castPayoutStatus(status: string): PayoutStatus {
  return status as PayoutStatus;
}

export function castConfirmationStatus(
  status: string
): ConfirmationFinalStatus {
  return status as ConfirmationFinalStatus;
}

export function castDisputeResolution(
  resolution: string | null
): DisputeResolution | null {
  return resolution as DisputeResolution | null;
}

/**
 * Cast Prisma PayoutCycle result to typed PayoutCycle
 */
export function castPayoutCycle(
  cycle: {
    id: string;
    startDate: Date;
    endDate: Date;
    cutoffDate: Date;
    status: string;
    processedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  } | null
): PayoutCycle | null {
  if (!cycle) return null;
  return {
    ...cycle,
    status: castCycleStatus(cycle.status),
  };
}

/**
 * Cast Prisma Earning result to typed Earning
 */
export function castEarning(
  earning: {
    id: string;
    professionalId: string;
    appointmentId: string;
    cycleId: string;
    grossAmount: number;
    platformFeePercent: number;
    platformFeeAmount: number;
    netAmount: number;
    sessionDurationMinutes: number;
    hourlyRate: number;
    sessionStartTime: Date;
    sessionEndTime: Date;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  } | null
): Earning | null {
  if (!earning) return null;
  return {
    ...earning,
    status: castEarningStatus(earning.status),
  };
}

/**
 * Cast Prisma Payout result to typed Payout
 */
export function castPayout(
  payout: {
    id: string;
    professionalId: string;
    cycleId: string;
    grossTotal: number;
    platformFeeTotal: number;
    netTotal: number;
    earningsCount: number;
    status: string;
    stripePayoutId: string | null;
    stripeTransferId: string | null;
    processedAt: Date | null;
    failedReason: string | null;
    createdAt: Date;
    updatedAt: Date;
  } | null
): Payout | null {
  if (!payout) return null;
  return {
    ...payout,
    status: castPayoutStatus(payout.status),
  };
}

/**
 * Cast Prisma AppointmentConfirmation result to typed AppointmentConfirmation
 */
export function castConfirmation(
  confirmation: {
    id: string;
    appointmentId: string;
    clientId: string;
    clientConfirmed: boolean | null;
    clientConfirmedAt: Date | null;
    clientReviewId: string | null;
    professionalId: string;
    professionalUserId: string;
    professionalConfirmed: boolean | null;
    professionalConfirmedAt: Date | null;
    finalStatus: string;
    isDisputed: boolean;
    disputeReason: string | null;
    disputeCreatedAt: Date | null;
    disputeResolvedAt: Date | null;
    disputeResolution: string | null;
    createdAt: Date;
    updatedAt: Date;
  } | null
): AppointmentConfirmation | null {
  if (!confirmation) return null;
  return {
    ...confirmation,
    finalStatus: castConfirmationStatus(confirmation.finalStatus),
    disputeResolution: castDisputeResolution(confirmation.disputeResolution),
  };
}

/**
 * Determine if we should show monthly view based on earnings history
 * Shows monthly view if user has earnings older than 8 weeks
 */
export function shouldShowMonthlyView(firstEarningDate: Date): boolean {
  const eightWeeksAgo = new Date();
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56); // 8 weeks = 56 days

  return firstEarningDate < eightWeeksAgo;
}
