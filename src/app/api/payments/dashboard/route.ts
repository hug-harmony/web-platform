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
  getWeeklyBreakdown,
  getMonthlyBreakdown,
  getPaymentMethodStatus,
  getPendingFeeTotal,
  getFeeChargesForProfessional,
} from "@/lib/services/payments";
import { shouldShowMonthlyView } from "@/lib/services/payments/helpers";
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
      paymentMethod,
      pendingFees,
      recentCharges,
      weeklyBreakdown,
    ] = await Promise.all([
      getCurrentCycleInfo(),
      getCurrentCycleEarningsSummary(professionalId),
      getLifetimeEarningsSummary(professionalId),
      getPendingConfirmations(session.user.id, "client"),
      getPendingConfirmations(session.user.id, "professional"),
      getEarningsForProfessional(professionalId, { limit: 10, page: 1 }),
      getPaymentMethodStatus(professionalId),
      getPendingFeeTotal(professionalId),
      getFeeChargesForProfessional(professionalId, { limit: 5 }),
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
        confirmationDeadline: cycleInfo.current.confirmationDeadline,
        daysRemaining: cycleInfo.daysRemaining,
        hoursUntilDeadline: cycleInfo.hoursUntilDeadline,
        isProcessing: cycleInfo.isProcessing,
      },

      // Current cycle earnings
      currentCycleEarnings: {
        gross: currentCycleEarnings.gross,
        platformFee: currentCycleEarnings.platformFee,
        platformFeePercent: currentCycleEarnings.platformFeePercent,
        sessionsCount: currentCycleEarnings.sessionsCount,
        pendingConfirmations: currentCycleEarnings.pendingCount,
        confirmedCount: currentCycleEarnings.confirmedCount,
      },

      // Lifetime stats
      lifetime: {
        totalGross: lifetime.totalGross,
        totalPlatformFees: lifetime.totalPlatformFees,
        totalSessions: lifetime.totalSessions,
        totalCharged: lifetime.totalCharged,
      },

      // Payment method status
      paymentMethod,

      // Pending fees to be charged
      pendingFees,

      // Recent fee charges
      recentCharges: recentCharges.data,

      // Pending confirmations
      pendingConfirmations,
      pendingConfirmationsCount: pendingConfirmations.length,

      // Recent earnings
      recentEarnings: recentEarnings.data,

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
