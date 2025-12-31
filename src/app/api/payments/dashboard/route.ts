// src/app/api/payments/dashboard/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getCurrentCycleInfo,
  getCurrentCycleEarningsSummary,
  getLifetimeEarningsSummary,
  getPendingConfirmations,
  getEarningsForProfessional,
  getUpcomingPayoutEstimate,
  getWeeklyBreakdown,
  shouldShowMonthlyView,
  getMonthlyBreakdown,
} from "@/lib/services/payments";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get professional ID for the user
    const application = await prisma.professionalApplication.findUnique({
      where: { userId: session.user.id },
      select: { professionalId: true, status: true },
    });

    if (application?.status !== "APPROVED" || !application.professionalId) {
      return NextResponse.json(
        {
          error:
            "You must be an approved professional to view payment dashboard",
        },
        { status: 403 }
      );
    }

    const professionalId = application.professionalId;

    // Fetch all dashboard data in parallel
    const [
      cycleInfo,
      currentCycleEarnings,
      lifetime,
      pendingAsClient,
      pendingAsProfessional,
      recentEarnings,
      upcomingPayout,
      weeklyBreakdown,
    ] = await Promise.all([
      getCurrentCycleInfo(),
      getCurrentCycleEarningsSummary(professionalId),
      getLifetimeEarningsSummary(professionalId),
      getPendingConfirmations(session.user.id, "client"),
      getPendingConfirmations(session.user.id, "professional"),
      getEarningsForProfessional(professionalId, { limit: 10, page: 1 }),
      getUpcomingPayoutEstimate(professionalId),
      getWeeklyBreakdown(professionalId, { limit: 4 }),
    ]);

    // Determine if we should show monthly view
    const firstEarning = await prisma.earning.findFirst({
      where: { professionalId },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    });

    const showMonthlyView = firstEarning
      ? shouldShowMonthlyView(firstEarning.createdAt)
      : false;

    // Get monthly breakdown if needed
    let monthlyBreakdown = null;
    if (showMonthlyView) {
      monthlyBreakdown = await getMonthlyBreakdown(professionalId, {
        limit: 6,
      });
    }

    // Combine pending confirmations
    const pendingConfirmations = [
      ...pendingAsClient.map((c) => ({ ...c, role: "client" as const })),
      ...pendingAsProfessional.map((c) => ({
        ...c,
        role: "professional" as const,
      })),
    ].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      // Current cycle info
      currentCycle: {
        id: cycleInfo.current.id,
        startDate: cycleInfo.current.startDate,
        endDate: cycleInfo.current.endDate,
        daysRemaining: cycleInfo.daysRemaining,
        hoursUntilCutoff: cycleInfo.hoursUntilCutoff,
        isProcessing: cycleInfo.isProcessing,
      },

      // Current cycle earnings
      currentCycleEarnings: {
        gross: currentCycleEarnings.gross,
        platformFee: currentCycleEarnings.platformFee,
        net: currentCycleEarnings.net,
        sessionsCount: currentCycleEarnings.sessionsCount,
        pendingConfirmations: currentCycleEarnings.pendingCount,
        confirmedCount: currentCycleEarnings.confirmedCount,
      },

      // Lifetime stats
      lifetime: {
        totalGross: lifetime.totalGross,
        totalPlatformFees: lifetime.totalPlatformFees,
        totalNet: lifetime.totalNet,
        totalSessions: lifetime.totalSessions,
        totalPayouts: lifetime.totalPaidOut,
      },

      // Pending confirmations
      pendingConfirmations,
      pendingConfirmationsCount: pendingConfirmations.length,

      // Recent earnings
      recentEarnings: recentEarnings.data,

      // Upcoming payout
      upcomingPayout,

      // History breakdown
      weeklyBreakdown,
      monthlyBreakdown,
      showMonthlyView,
    });
  } catch (error) {
    console.error("GET payment dashboard error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
