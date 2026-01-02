// src/lib/services/payments/helpers.ts

import {
  CycleStatus,
  EarningStatus,
  FeeChargeStatus,
  ConfirmationFinalStatus,
  DisputeResolution,
} from "@/types/payments";

/**
 * Type casting helpers for Prisma results
 */

export function castCycleStatus(status: string): CycleStatus {
  return status as CycleStatus;
}

export function castEarningStatus(status: string): EarningStatus {
  return status as EarningStatus;
}

export function castFeeChargeStatus(status: string): FeeChargeStatus {
  return status as FeeChargeStatus;
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
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

/**
 * Calculate days remaining until a date
 */
export function getDaysUntil(date: Date): number {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/**
 * Calculate hours remaining until a date
 */
export function getHoursUntil(date: Date): number {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60)));
}

/**
 * Check if a date has passed
 */
export function isPast(date: Date): boolean {
  return new Date() > date;
}

/**
 * Get next retry date for failed charges (daily retry)
 */
export function getNextRetryDate(): Date {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0); // 9 AM next day
  return tomorrow;
}

/**
 * Determine if we should show monthly view based on earnings history
 */
export function shouldShowMonthlyView(firstEarningDate: Date): boolean {
  const eightWeeksAgo = new Date();
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);
  return firstEarningDate < eightWeeksAgo;
}

/**
 * Get month name from month number (1-12)
 */
export function getMonthName(month: number): string {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return months[month - 1] || "";
}

/**
 * Get ISO week number for a date
 */
export function getISOWeekNumber(date: Date): number {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
