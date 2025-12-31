// src/lib/utils/paymentCycle.ts

import { CycleDate } from "@/types/payments";

/**
 * Payment Cycle Utilities
 *
 * Cycle: Monday 12:00 AM UTC → Sunday 11:59:59 PM UTC
 * Cutoff: Following Monday 3:00 PM UTC
 *
 * Key Rules:
 * 1. Sessions spanning Sunday midnight → Next cycle (based on END time)
 * 2. Sessions ending after cutoff → Next cycle
 */

// ============================================
// CONSTANTS
// ============================================

/** Cutoff hour on Monday (24-hour format, UTC) */
export const CUTOFF_HOUR = 15; // 3:00 PM UTC

/** Days of the week */
export const MONDAY = 1;
export const SUNDAY = 0;

// ============================================
// CORE CYCLE FUNCTIONS
// ============================================

/**
 * Get the start of the current payment cycle (Monday 12:00 AM UTC)
 */
export function getCurrentCycleStart(referenceDate: Date = new Date()): Date {
  const date = new Date(referenceDate);

  // Set to start of day in UTC
  date.setUTCHours(0, 0, 0, 0);

  // Get current day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const dayOfWeek = date.getUTCDay();

  // Calculate days to subtract to get to Monday
  // If Sunday (0), go back 6 days
  // If Monday (1), go back 0 days
  // If Tuesday (2), go back 1 day, etc.
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  date.setUTCDate(date.getUTCDate() - daysToSubtract);

  return date;
}

/**
 * Get the end of the current payment cycle (Sunday 11:59:59.999 PM UTC)
 */
export function getCurrentCycleEnd(referenceDate: Date = new Date()): Date {
  const cycleStart = getCurrentCycleStart(referenceDate);

  // Add 6 days to get to Sunday
  const cycleEnd = new Date(cycleStart);
  cycleEnd.setUTCDate(cycleEnd.getUTCDate() + 6);

  // Set to end of day
  cycleEnd.setUTCHours(23, 59, 59, 999);

  return cycleEnd;
}

/**
 * Get the cutoff date for a cycle (following Monday 3:00 PM UTC)
 */
export function getCycleCutoffDate(cycleStart: Date): Date {
  const cutoff = new Date(cycleStart);

  // Add 7 days to get to next Monday
  cutoff.setUTCDate(cutoff.getUTCDate() + 7);

  // Set to 3:00 PM UTC
  cutoff.setUTCHours(CUTOFF_HOUR, 0, 0, 0);

  return cutoff;
}

/**
 * Get complete cycle date information
 */
export function getCycleDates(referenceDate: Date = new Date()): CycleDate {
  const startDate = getCurrentCycleStart(referenceDate);
  const endDate = getCurrentCycleEnd(referenceDate);
  const cutoffDate = getCycleCutoffDate(startDate);

  // Calculate ISO week number
  const weekNumber = getISOWeekNumber(startDate);
  const year = startDate.getUTCFullYear();

  return {
    startDate,
    endDate,
    cutoffDate,
    weekNumber,
    year,
  };
}

/**
 * Get cycle dates for a specific week offset from current
 * @param offset - Positive for future, negative for past
 */
export function getCycleDatesWithOffset(offset: number): CycleDate {
  const referenceDate = new Date();
  referenceDate.setUTCDate(referenceDate.getUTCDate() + offset * 7);
  return getCycleDates(referenceDate);
}

/**
 * Get the previous cycle dates
 */
export function getPreviousCycleDates(): CycleDate {
  return getCycleDatesWithOffset(-1);
}

/**
 * Get the next cycle dates
 */
export function getNextCycleDates(): CycleDate {
  return getCycleDatesWithOffset(1);
}

// ============================================
// CYCLE DETERMINATION FUNCTIONS
// ============================================

/**
 * Determine which cycle an appointment belongs to based on its END time
 *
 * Rules:
 * 1. If appointment ends before cycle end → Current cycle
 * 2. If appointment ends after cycle end (spans midnight Sunday) → Next cycle
 * 3. If appointment ends after cutoff → Next cycle
 */
export function determineCycleForAppointment(
  appointmentEndTime: Date,
  referenceDate: Date = new Date()
): CycleDate {
  const currentCycle = getCycleDates(referenceDate);

  // Check if appointment ends within current cycle
  if (appointmentEndTime <= currentCycle.endDate) {
    return currentCycle;
  }

  // Appointment spans into next cycle
  return getCycleDatesWithOffset(1);
}

/**
 * Check if an earning should be included in a specific cycle
 */
export function isEarningInCycle(
  sessionEndTime: Date,
  cycleStart: Date,
  cycleEnd: Date
): boolean {
  return sessionEndTime >= cycleStart && sessionEndTime <= cycleEnd;
}

/**
 * Check if we're past the cutoff for a cycle
 */
export function isPastCutoff(cycleStart: Date): boolean {
  const cutoffDate = getCycleCutoffDate(cycleStart);
  return new Date() > cutoffDate;
}

/**
 * Check if a cycle is still accepting earnings
 */
export function isCycleActive(cycleStart: Date, cycleEnd: Date): boolean {
  const now = new Date();

  // Cycle is active if:
  // 1. Current time is within the cycle period, OR
  // 2. Cycle has ended but we're before cutoff (confirmation period)
  if (now <= cycleEnd) {
    return true;
  }

  // We're past cycle end, check if before cutoff
  return !isPastCutoff(cycleStart);
}

// ============================================
// TIME REMAINING FUNCTIONS
// ============================================

/**
 * Get days remaining in current cycle
 */
export function getDaysRemainingInCycle(
  referenceDate: Date = new Date()
): number {
  const cycleEnd = getCurrentCycleEnd(referenceDate);
  const now = new Date();

  const diffMs = cycleEnd.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
}

/**
 * Get hours until cutoff
 */
export function getHoursUntilCutoff(referenceDate: Date = new Date()): number {
  const cycleStart = getCurrentCycleStart(referenceDate);
  const cutoffDate = getCycleCutoffDate(cycleStart);
  const now = new Date();

  const diffMs = cutoffDate.getTime() - now.getTime();
  const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));

  return Math.max(0, diffHours);
}

/**
 * Get time until next payout processing
 */
export function getTimeUntilNextPayout(): {
  days: number;
  hours: number;
  minutes: number;
} {
  const cycleStart = getCurrentCycleStart();
  const cutoffDate = getCycleCutoffDate(cycleStart);
  const now = new Date();

  const diffMs = cutoffDate.getTime() - now.getTime();

  if (diffMs <= 0) {
    return { days: 0, hours: 0, minutes: 0 };
  }

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  return { days, hours, minutes };
}

// ============================================
// WEEK NUMBER UTILITIES
// ============================================

/**
 * Get ISO week number for a date
 */
export function getISOWeekNumber(date: Date): number {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );

  // Set to nearest Thursday: current date + 4 - current day number
  // Make Sunday's day number 7
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);

  // Get first day of year
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));

  // Calculate full weeks to nearest Thursday
  const weekNo = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );

  return weekNo;
}

/**
 * Get the Monday of a specific ISO week
 */
export function getMondayOfWeek(year: number, week: number): Date {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7;

  // Get Monday of week 1
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1);

  // Add weeks
  const targetMonday = new Date(week1Monday);
  targetMonday.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);

  return targetMonday;
}

// ============================================
// FORMATTING UTILITIES
// ============================================

/**
 * Format cycle date range for display
 */
export function formatCycleDateRange(startDate: Date, endDate: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
  };

  const startStr = startDate.toLocaleDateString("en-US", options);
  const endStr = endDate.toLocaleDateString("en-US", {
    ...options,
    year: "numeric",
  });

  return `${startStr} - ${endStr}`;
}

/**
 * Format cycle as "Week X, Year"
 */
export function formatCycleWeek(startDate: Date): string {
  const weekNumber = getISOWeekNumber(startDate);
  const year = startDate.getUTCFullYear();
  return `Week ${weekNumber}, ${year}`;
}

/**
 * Get month name from month number
 */
export function getMonthName(month: number): string {
  const date = new Date(2000, month - 1, 1);
  return date.toLocaleDateString("en-US", { month: "long" });
}

// ============================================
// HISTORY GROUPING UTILITIES
// ============================================

/**
 * Determine if history should be shown as monthly (after 4 weeks)
 */
export function shouldShowMonthlyView(firstEarningDate: Date): boolean {
  const now = new Date();
  const diffMs = now.getTime() - firstEarningDate.getTime();
  const diffWeeks = diffMs / (1000 * 60 * 60 * 24 * 7);
  return diffWeeks >= 4;
}

/**
 * Get all cycle dates between two dates
 */
export function getCyclesBetweenDates(
  startDate: Date,
  endDate: Date
): CycleDate[] {
  const cycles: CycleDate[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const cycleDates = getCycleDates(currentDate);

    // Avoid duplicates
    if (
      cycles.length === 0 ||
      cycles[cycles.length - 1].startDate.getTime() !==
        cycleDates.startDate.getTime()
    ) {
      cycles.push(cycleDates);
    }

    // Move to next week
    currentDate.setUTCDate(currentDate.getUTCDate() + 7);
  }

  return cycles;
}

/**
 * Group cycles by month
 */
export function groupCyclesByMonth(
  cycles: CycleDate[]
): Map<string, CycleDate[]> {
  const grouped = new Map<string, CycleDate[]>();

  for (const cycle of cycles) {
    const key = `${cycle.startDate.getUTCFullYear()}-${String(
      cycle.startDate.getUTCMonth() + 1
    ).padStart(2, "0")}`;

    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(cycle);
  }

  return grouped;
}

// ============================================
// VALIDATION UTILITIES
// ============================================

/**
 * Validate that a date range represents a valid cycle
 */
export function isValidCycle(startDate: Date, endDate: Date): boolean {
  // Start must be Monday
  if (startDate.getUTCDay() !== MONDAY) {
    return false;
  }

  // End must be Sunday
  if (endDate.getUTCDay() !== SUNDAY) {
    return false;
  }

  // Must be exactly 7 days apart (accounting for end of day)
  const diffDays =
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays < 6 || diffDays > 7) {
    return false;
  }

  return true;
}

/**
 * Check if an appointment time is valid for earning creation
 */
export function canCreateEarningForAppointment(
  appointmentEndTime: Date
): boolean {
  const now = new Date();

  // Appointment must have ended
  if (appointmentEndTime > now) {
    return false;
  }

  // Determine which cycle this belongs to
  const cycle = determineCycleForAppointment(appointmentEndTime);

  // Check if we're still before cutoff for that cycle
  return !isPastCutoff(cycle.startDate);
}
