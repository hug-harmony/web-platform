// src/lib/services/payments/earnings.service.ts

import prisma from "@/lib/prisma";
import {
  Earning,
  EarningWithDetails,
  EarningCreateInput,
  EarningStatus,
  EarningCalculation,
  EarningsHistoryFilters,
  EarningsResponse,
  WeeklyBreakdown,
  MonthlyBreakdown,
  CycleStatus,
} from "@/types/payments";
import { getCycleForAppointment } from "./cycle.service";
import {
  canCreateEarningForAppointment,
  getMonthName,
  getISOWeekNumber,
} from "@/lib/utils/paymentCycle";
import { buildDisplayName } from "@/lib/utils";
import { castEarningStatus, castCycleStatus } from "./helpers";

// ============================================
// EARNING CALCULATIONS
// ============================================

/**
 * Calculate earning amounts from session details
 */
export function calculateEarning(
  sessionStartTime: Date,
  sessionEndTime: Date,
  hourlyRate: number,
  platformFeePercent: number
): EarningCalculation {
  // Calculate duration in minutes
  const durationMs = sessionEndTime.getTime() - sessionStartTime.getTime();
  const sessionDurationMinutes = Math.round(durationMs / (1000 * 60));

  // Calculate gross amount (hourly rate * hours)
  const hours = sessionDurationMinutes / 60;
  const grossAmount = Math.round(hourlyRate * hours * 100) / 100;

  // Calculate platform fee
  const platformFeeAmount =
    Math.round(grossAmount * (platformFeePercent / 100) * 100) / 100;

  // Calculate net amount
  const netAmount = Math.round((grossAmount - platformFeeAmount) * 100) / 100;

  return {
    sessionDurationMinutes,
    hourlyRate,
    grossAmount,
    platformFeePercent,
    platformFeeAmount,
    netAmount,
  };
}

/**
 * Get current platform fee percentage
 */
export async function getPlatformFeePercent(
  professionalId?: string
): Promise<number> {
  // First check if professional has a custom rate
  if (professionalId) {
    const professional = await prisma.professional.findUnique({
      where: { id: professionalId },
      select: { companyCutPercentage: true },
    });

    if (
      professional?.companyCutPercentage !== null &&
      professional?.companyCutPercentage !== undefined
    ) {
      return professional.companyCutPercentage;
    }
  }

  // Fall back to global setting
  const setting = await prisma.companySettings.findUnique({
    where: { key: "companyCutPercentage" },
  });

  return setting?.value ?? 20.0; // Default 20%
}

// ============================================
// EARNING CREATION
// ============================================

/**
 * Create an earning record for a completed appointment
 */
export async function createEarning(
  input: EarningCreateInput
): Promise<Earning> {
  const {
    professionalId,
    appointmentId,
    sessionStartTime,
    sessionEndTime,
    hourlyRate,
    platformFeePercent,
  } = input;

  // Validate appointment hasn't already ended
  if (!canCreateEarningForAppointment(sessionEndTime)) {
    throw new Error(
      "Cannot create earning: appointment end time is invalid or past cutoff"
    );
  }

  // Check if earning already exists for this appointment
  const existingEarning = await prisma.earning.findUnique({
    where: { appointmentId },
  });

  if (existingEarning) {
    throw new Error("Earning already exists for this appointment");
  }

  // Get or create the appropriate cycle
  const cycle = await getCycleForAppointment(sessionEndTime);

  // Calculate amounts
  const calculation = calculateEarning(
    sessionStartTime,
    sessionEndTime,
    hourlyRate,
    platformFeePercent
  );

  // Create earning
  const earning = await prisma.earning.create({
    data: {
      professionalId,
      appointmentId,
      cycleId: cycle.id,
      grossAmount: calculation.grossAmount,
      platformFeePercent: calculation.platformFeePercent,
      platformFeeAmount: calculation.platformFeeAmount,
      netAmount: calculation.netAmount,
      sessionDurationMinutes: calculation.sessionDurationMinutes,
      hourlyRate: calculation.hourlyRate,
      sessionStartTime,
      sessionEndTime,
      status: "pending",
    },
  });

  return {
    ...earning,
    status: castEarningStatus(earning.status),
  };
}

/**
 * Create earning from an appointment (fetches appointment details)
 */
export async function createEarningFromAppointment(
  appointmentId: string
): Promise<Earning> {
  // Get appointment with professional details
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      professional: {
        select: {
          id: true,
          rate: true,
          companyCutPercentage: true,
        },
      },
    },
  });

  if (!appointment) {
    throw new Error("Appointment not found");
  }

  if (!appointment.professional) {
    throw new Error("Professional not found for appointment");
  }

  // Determine hourly rate (use adjusted rate if available)
  const hourlyRate =
    appointment.adjustedRate ??
    appointment.rate ??
    appointment.professional.rate ??
    0;

  if (hourlyRate <= 0) {
    throw new Error("Invalid hourly rate for appointment");
  }

  // Get platform fee
  const platformFeePercent = await getPlatformFeePercent(
    appointment.professionalId
  );

  return createEarning({
    professionalId: appointment.professionalId,
    appointmentId,
    sessionStartTime: appointment.startTime,
    sessionEndTime: appointment.endTime,
    hourlyRate,
    platformFeePercent,
  });
}

// ============================================
// EARNING STATUS MANAGEMENT
// ============================================

/**
 * Update earning status
 */
export async function updateEarningStatus(
  earningId: string,
  status: EarningStatus
): Promise<Earning> {
  const earning = await prisma.earning.update({
    where: { id: earningId },
    data: { status },
  });

  return {
    ...earning,
    status: castEarningStatus(earning.status),
  };
}

/**
 * Confirm an earning (both parties confirmed appointment occurred)
 */
export async function confirmEarning(earningId: string): Promise<Earning> {
  return updateEarningStatus(earningId, "confirmed");
}

/**
 * Cancel an earning (appointment did not occur)
 */
export async function cancelEarning(earningId: string): Promise<Earning> {
  return updateEarningStatus(earningId, "cancelled");
}

/**
 * Mark earning as disputed
 */
export async function disputeEarning(earningId: string): Promise<Earning> {
  return updateEarningStatus(earningId, "disputed");
}

/**
 * Mark earning as paid
 */
export async function markEarningAsPaid(earningId: string): Promise<Earning> {
  return updateEarningStatus(earningId, "paid");
}

/**
 * Mark multiple earnings as paid
 */
export async function markEarningsAsPaid(
  earningIds: string[]
): Promise<number> {
  const result = await prisma.earning.updateMany({
    where: {
      id: { in: earningIds },
      status: "confirmed",
    },
    data: { status: "paid" },
  });

  return result.count;
}

// ============================================
// EARNING RETRIEVAL
// ============================================

/**
 * Get earning by ID with details
 */
export async function getEarningById(
  earningId: string
): Promise<EarningWithDetails | null> {
  const earning = await prisma.earning.findUnique({
    where: { id: earningId },
    include: {
      appointment: {
        select: {
          id: true,
          venue: true,
          status: true,
          user: {
            select: {
              id: true,
              name: true,
              firstName: true,
              lastName: true,
              profileImage: true,
            },
          },
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
  });

  if (!earning) return null;

  return {
    ...earning,
    status: castEarningStatus(earning.status),
    appointment: {
      id: earning.appointment.id,
      venue: earning.appointment.venue,
      status: earning.appointment.status,
    },
    client: earning.appointment.user
      ? {
          id: earning.appointment.user.id,
          name: buildDisplayName(earning.appointment.user),
          profileImage: earning.appointment.user.profileImage,
        }
      : null,
    cycle: {
      ...earning.cycle,
      status: castCycleStatus(earning.cycle.status),
    },
  };
}

/**
 * Get earning by appointment ID
 */
export async function getEarningByAppointmentId(
  appointmentId: string
): Promise<Earning | null> {
  const earning = await prisma.earning.findUnique({
    where: { appointmentId },
  });

  if (!earning) return null;

  return {
    ...earning,
    status: castEarningStatus(earning.status),
  };
}

/**
 * Get earnings for a professional
 */
export async function getEarningsForProfessional(
  professionalId: string,
  filters?: EarningsHistoryFilters
): Promise<EarningsResponse> {
  const {
    startDate,
    endDate,
    status,
    cycleId,
    page = 1,
    limit = 20,
  } = filters || {};

  const where = {
    professionalId,
    ...(startDate && { sessionStartTime: { gte: startDate } }),
    ...(endDate && { sessionEndTime: { lte: endDate } }),
    ...(status && { status }),
    ...(cycleId && { cycleId }),
  };

  const [earnings, total, aggregation] = await Promise.all([
    prisma.earning.findMany({
      where,
      include: {
        appointment: {
          select: {
            id: true,
            venue: true,
            status: true,
            user: {
              select: {
                id: true,
                name: true,
                firstName: true,
                lastName: true,
                profileImage: true,
              },
            },
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
      orderBy: { sessionStartTime: "desc" },
      take: limit,
      skip: (page - 1) * limit,
    }),
    prisma.earning.count({ where }),
    prisma.earning.aggregate({
      where,
      _sum: {
        grossAmount: true,
        platformFeeAmount: true,
        netAmount: true,
      },
    }),
  ]);

  const data: EarningWithDetails[] = earnings.map((earning) => ({
    ...earning,
    status: castEarningStatus(earning.status),
    appointment: {
      id: earning.appointment.id,
      venue: earning.appointment.venue,
      status: earning.appointment.status,
    },
    client: earning.appointment.user
      ? {
          id: earning.appointment.user.id,
          name: buildDisplayName(earning.appointment.user),
          profileImage: earning.appointment.user.profileImage,
        }
      : null,
    cycle: {
      ...earning.cycle,
      status: castCycleStatus(earning.cycle.status),
    },
  }));

  return {
    data,
    total,
    page,
    limit,
    hasMore: page * limit < total,
    summary: {
      totalGross: aggregation._sum.grossAmount || 0,
      totalPlatformFees: aggregation._sum.platformFeeAmount || 0,
      totalNet: aggregation._sum.netAmount || 0,
    },
  };
}

/**
 * Get earnings for a cycle
 */
export async function getEarningsForCycle(
  cycleId: string,
  professionalId?: string
): Promise<EarningWithDetails[]> {
  const earnings = await prisma.earning.findMany({
    where: {
      cycleId,
      ...(professionalId && { professionalId }),
    },
    include: {
      appointment: {
        select: {
          id: true,
          venue: true,
          status: true,
          user: {
            select: {
              id: true,
              name: true,
              firstName: true,
              lastName: true,
              profileImage: true,
            },
          },
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
    orderBy: { sessionStartTime: "desc" },
  });

  return earnings.map((earning) => ({
    ...earning,
    status: castEarningStatus(earning.status),
    appointment: {
      id: earning.appointment.id,
      venue: earning.appointment.venue,
      status: earning.appointment.status,
    },
    client: earning.appointment.user
      ? {
          id: earning.appointment.user.id,
          name: buildDisplayName(earning.appointment.user),
          profileImage: earning.appointment.user.profileImage,
        }
      : null,
    cycle: {
      ...earning.cycle,
      status: castCycleStatus(earning.cycle.status),
    },
  }));
}

// ============================================
// EARNINGS AGGREGATION
// ============================================

/**
 * Get current cycle earnings summary for a professional
 */
export async function getCurrentCycleEarningsSummary(
  professionalId: string
): Promise<{
  gross: number;
  platformFee: number;
  net: number;
  sessionsCount: number;
  pendingCount: number;
  confirmedCount: number;
}> {
  const cycle = await getCycleForAppointment(new Date());

  const [aggregation, statusCounts] = await Promise.all([
    prisma.earning.aggregate({
      where: {
        professionalId,
        cycleId: cycle.id,
        status: { in: ["pending", "confirmed"] },
      },
      _sum: {
        grossAmount: true,
        platformFeeAmount: true,
        netAmount: true,
      },
      _count: true,
    }),
    prisma.earning.groupBy({
      by: ["status"],
      where: {
        professionalId,
        cycleId: cycle.id,
        status: { in: ["pending", "confirmed"] },
      },
      _count: true,
    }),
  ]);

  const pendingCount =
    statusCounts.find((s) => s.status === "pending")?._count || 0;
  const confirmedCount =
    statusCounts.find((s) => s.status === "confirmed")?._count || 0;

  return {
    gross: aggregation._sum.grossAmount || 0,
    platformFee: aggregation._sum.platformFeeAmount || 0,
    net: aggregation._sum.netAmount || 0,
    sessionsCount: aggregation._count || 0,
    pendingCount,
    confirmedCount,
  };
}

/**
 * Get lifetime earnings summary for a professional
 */
export async function getLifetimeEarningsSummary(
  professionalId: string
): Promise<{
  totalGross: number;
  totalPlatformFees: number;
  totalNet: number;
  totalSessions: number;
  totalPaidOut: number;
}> {
  const [aggregation, paidAggregation] = await Promise.all([
    prisma.earning.aggregate({
      where: {
        professionalId,
        status: { in: ["confirmed", "paid"] },
      },
      _sum: {
        grossAmount: true,
        platformFeeAmount: true,
        netAmount: true,
      },
      _count: true,
    }),
    prisma.earning.aggregate({
      where: {
        professionalId,
        status: "paid",
      },
      _sum: {
        netAmount: true,
      },
    }),
  ]);

  return {
    totalGross: aggregation._sum.grossAmount || 0,
    totalPlatformFees: aggregation._sum.platformFeeAmount || 0,
    totalNet: aggregation._sum.netAmount || 0,
    totalSessions: aggregation._count || 0,
    totalPaidOut: paidAggregation._sum.netAmount || 0,
  };
}

/**
 * Get weekly breakdown for a professional
 */
export async function getWeeklyBreakdown(
  professionalId: string,
  options?: {
    limit?: number;
    offset?: number;
  }
): Promise<WeeklyBreakdown[]> {
  const { limit = 10, offset = 0 } = options || {};

  // Get cycles with earnings for this professional
  const cycles = await prisma.payoutCycle.findMany({
    where: {
      earnings: {
        some: {
          professionalId,
        },
      },
    },
    include: {
      earnings: {
        where: {
          professionalId,
          status: { in: ["pending", "confirmed", "paid"] },
        },
        select: {
          grossAmount: true,
          platformFeeAmount: true,
          netAmount: true,
        },
      },
      payouts: {
        where: {
          professionalId,
        },
        select: {
          id: true,
          status: true,
        },
      },
    },
    orderBy: {
      startDate: "desc",
    },
    take: limit,
    skip: offset,
  });

  return cycles.map((cycle) => {
    const totals = cycle.earnings.reduce(
      (acc, e) => ({
        gross: acc.gross + e.grossAmount,
        platformFee: acc.platformFee + e.platformFeeAmount,
        net: acc.net + e.netAmount,
      }),
      { gross: 0, platformFee: 0, net: 0 }
    );

    const payout = cycle.payouts[0];

    return {
      cycleId: cycle.id,
      weekNumber: getISOWeekNumber(cycle.startDate),
      startDate: cycle.startDate,
      endDate: cycle.endDate,
      grossTotal: totals.gross,
      platformFeeTotal: totals.platformFee,
      netTotal: totals.net,
      sessionsCount: cycle.earnings.length,
      status: (payout?.status || cycle.status) as CycleStatus,
      payoutId: payout?.id || null,
    };
  });
}

/**
 * Get monthly breakdown for a professional
 */
export async function getMonthlyBreakdown(
  professionalId: string,
  options?: {
    year?: number;
    limit?: number;
  }
): Promise<MonthlyBreakdown[]> {
  const { year, limit = 12 } = options || {};

  // Get all earnings grouped by month
  const earnings = await prisma.earning.findMany({
    where: {
      professionalId,
      status: { in: ["confirmed", "paid"] },
      ...(year && {
        sessionStartTime: {
          gte: new Date(year, 0, 1),
          lt: new Date(year + 1, 0, 1),
        },
      }),
    },
    select: {
      grossAmount: true,
      platformFeeAmount: true,
      netAmount: true,
      sessionStartTime: true,
      cycleId: true,
    },
    orderBy: {
      sessionStartTime: "desc",
    },
  });

  // Get payout counts
  const payouts = await prisma.payout.findMany({
    where: {
      professionalId,
      status: "completed",
    },
    select: {
      cycle: {
        select: {
          startDate: true,
        },
      },
    },
  });

  // Group by month
  const monthlyMap = new Map<
    string,
    {
      year: number;
      month: number;
      gross: number;
      platformFee: number;
      net: number;
      sessions: number;
      cycles: Set<string>;
      payouts: number;
    }
  >();

  for (const earning of earnings) {
    const date = earning.sessionStartTime;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    if (!monthlyMap.has(key)) {
      monthlyMap.set(key, {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        gross: 0,
        platformFee: 0,
        net: 0,
        sessions: 0,
        cycles: new Set(),
        payouts: 0,
      });
    }

    const month = monthlyMap.get(key)!;
    month.gross += earning.grossAmount;
    month.platformFee += earning.platformFeeAmount;
    month.net += earning.netAmount;
    month.sessions += 1;
    month.cycles.add(earning.cycleId);
  }

  // Count payouts per month
  for (const payout of payouts) {
    const date = payout.cycle.startDate;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    if (monthlyMap.has(key)) {
      monthlyMap.get(key)!.payouts += 1;
    }
  }

  // Convert to array and sort
  const result: MonthlyBreakdown[] = Array.from(monthlyMap.values())
    .map((m) => ({
      year: m.year,
      month: m.month,
      monthName: getMonthName(m.month),
      weeksCount: m.cycles.size,
      grossTotal: m.gross,
      platformFeeTotal: m.platformFee,
      netTotal: m.net,
      sessionsCount: m.sessions,
      payoutsCount: m.payouts,
    }))
    .sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    })
    .slice(0, limit);

  return result;
}
