// src/lib/utils/paymentCycle.ts

/**
 * Payment Cycle Utilities
 *
 * Cycles run:
 * - 1st to 15th of each month
 * - 16th to end of month
 *
 * Confirmation deadline: Last day of cycle at 11:59:59 PM UTC
 */

export interface CycleDates {
  startDate: Date;
  endDate: Date;
  confirmationDeadline: Date;
}

/**
 * Get the cycle start date for a given date
 */
export function getCycleStartDate(date: Date = new Date()): Date {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  if (day <= 15) {
    // First half: starts on 1st
    return new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  } else {
    // Second half: starts on 16th
    return new Date(Date.UTC(year, month, 16, 0, 0, 0, 0));
  }
}

/**
 * Get the cycle end date for a given date
 */
export function getCycleEndDate(date: Date = new Date()): Date {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  if (day <= 15) {
    // First half: ends on 15th at 23:59:59.999
    return new Date(Date.UTC(year, month, 15, 23, 59, 59, 999));
  } else {
    // Second half: ends on last day of month at 23:59:59.999
    const lastDay = new Date(year, month + 1, 0).getDate();
    return new Date(Date.UTC(year, month, lastDay, 23, 59, 59, 999));
  }
}

/**
 * Get the confirmation deadline for a cycle
 * This is the same as the end date (last moment of the cycle)
 */
export function getConfirmationDeadline(cycleStartDate: Date): Date {
  return getCycleEndDate(cycleStartDate);
}

/**
 * Get all cycle dates for a given date
 */
export function getCycleDates(date: Date = new Date()): CycleDates {
  const startDate = getCycleStartDate(date);
  const endDate = getCycleEndDate(date);
  const confirmationDeadline = endDate; // Same as end date

  return {
    startDate,
    endDate,
    confirmationDeadline,
  };
}

/**
 * Get days remaining in the current cycle
 */
export function getDaysRemainingInCycle(date: Date = new Date()): number {
  const endDate = getCycleEndDate(date);
  const now = new Date();
  const diff = endDate.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/**
 * Get hours until confirmation deadline
 */
export function getHoursUntilDeadline(date: Date = new Date()): number {
  const deadline = getConfirmationDeadline(getCycleStartDate(date));
  const now = new Date();
  const diff = deadline.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60)));
}

/**
 * Check if we're past the confirmation deadline for a cycle
 */
export function isPastDeadline(cycleStartDate: Date): boolean {
  const deadline = getConfirmationDeadline(cycleStartDate);
  return new Date() > deadline;
}

/**
 * Check if an appointment can still be confirmed
 * (cycle hasn't ended yet)
 */
export function canConfirmAppointment(appointmentEndTime: Date): boolean {
  const cycleEnd = getCycleEndDate(appointmentEndTime);
  return new Date() <= cycleEnd;
}

/**
 * Get the next cycle dates
 */
export function getNextCycleDates(currentCycleStart: Date): CycleDates {
  const currentEnd = getCycleEndDate(currentCycleStart);
  const nextStart = new Date(currentEnd.getTime() + 1); // 1ms after current end
  return getCycleDates(nextStart);
}

/**
 * Get previous cycle dates
 */
export function getPreviousCycleDates(currentCycleStart: Date): CycleDates {
  const previousEnd = new Date(currentCycleStart.getTime() - 1);
  return getCycleDates(previousEnd);
}

/**
 * Get all cycles between two dates
 */
export function getCyclesBetweenDates(
  startDate: Date,
  endDate: Date
): CycleDates[] {
  const cycles: CycleDates[] = [];
  let current = getCycleDates(startDate);

  while (current.startDate <= endDate) {
    cycles.push(current);
    current = getNextCycleDates(current.startDate);
  }

  return cycles;
}

/**
 * Format cycle date range for display
 */
export function formatCycleDateRange(startDate: Date, endDate: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
  };

  const start = startDate.toLocaleDateString("en-US", options);
  const end = endDate.toLocaleDateString("en-US", {
    ...options,
    year: "numeric",
  });

  return `${start} - ${end}`;
}

/**
 * Get cycle identifier string (e.g., "2024-01-1H" for first half of Jan 2024)
 */
export function getCycleIdentifier(cycleStartDate: Date): string {
  const year = cycleStartDate.getFullYear();
  const month = String(cycleStartDate.getMonth() + 1).padStart(2, "0");
  const half = cycleStartDate.getDate() <= 15 ? "1H" : "2H";
  return `${year}-${month}-${half}`;
}
