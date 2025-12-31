// src/app/api/payments/earnings/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getEarningsForProfessional,
  getCurrentCycleEarningsSummary,
  getLifetimeEarningsSummary,
  getWeeklyBreakdown,
  getMonthlyBreakdown,
} from "@/lib/services/payments";
import { EarningStatus } from "@/types/payments";
import { getPreviousCycleDates } from "@/lib/utils/paymentCycle";
import { z } from "zod";

// Query params schema
const querySchema = z.object({
  view: z
    .enum(["list", "weekly", "monthly", "summary", "previous-cycle"])
    .optional()
    .default("list"),
  status: z
    .enum(["pending", "confirmed", "disputed", "cancelled", "paid"])
    .optional(),
  cycleId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  year: z.coerce.number().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get professional ID for the user
    const professionalId = await getProfessionalIdForUser(session.user.id);

    if (!professionalId) {
      return NextResponse.json(
        { error: "You must be a professional to view earnings" },
        { status: 403 }
      );
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const params = querySchema.parse({
      view: searchParams.get("view") || "list",
      status: searchParams.get("status") || undefined,
      cycleId: searchParams.get("cycleId") || undefined,
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      page: searchParams.get("page") || 1,
      limit: searchParams.get("limit") || 20,
      year: searchParams.get("year") || undefined,
    });

    // Handle different views
    switch (params.view) {
      case "summary": {
        const [currentCycle, lifetime] = await Promise.all([
          getCurrentCycleEarningsSummary(professionalId),
          getLifetimeEarningsSummary(professionalId),
        ]);

        return NextResponse.json({
          currentCycle,
          lifetime,
        });
      }

      case "previous-cycle": {
        const previousCycleSummary =
          await getPreviousCycleEarningsSummary(professionalId);

        return NextResponse.json(previousCycleSummary);
      }

      case "weekly": {
        const breakdown = await getWeeklyBreakdown(professionalId, {
          limit: params.limit,
          offset: (params.page - 1) * params.limit,
        });

        return NextResponse.json({
          data: breakdown,
          page: params.page,
          limit: params.limit,
        });
      }

      case "monthly": {
        const breakdown = await getMonthlyBreakdown(professionalId, {
          year: params.year,
          limit: params.limit,
        });

        return NextResponse.json({
          data: breakdown,
          year: params.year,
        });
      }

      case "list":
      default: {
        const earnings = await getEarningsForProfessional(professionalId, {
          status: params.status as EarningStatus | undefined,
          cycleId: params.cycleId,
          startDate: params.startDate ? new Date(params.startDate) : undefined,
          endDate: params.endDate ? new Date(params.endDate) : undefined,
          page: params.page,
          limit: params.limit,
        });

        return NextResponse.json(earnings);
      }
    }
  } catch (error) {
    console.error("GET earnings error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper function to get professional ID for a user
async function getProfessionalIdForUser(
  userId: string
): Promise<string | null> {
  const { default: prisma } = await import("@/lib/prisma");

  const application = await prisma.professionalApplication.findUnique({
    where: { userId },
    select: { professionalId: true, status: true },
  });

  if (application?.status === "APPROVED" && application.professionalId) {
    return application.professionalId;
  }

  return null;
}

// Helper function to get previous cycle earnings summary
async function getPreviousCycleEarningsSummary(professionalId: string) {
  const { default: prisma } = await import("@/lib/prisma");

  const previousCycle = getPreviousCycleDates();

  // Find the cycle in the database
  const cycle = await prisma.payoutCycle.findFirst({
    where: {
      startDate: {
        gte: new Date(previousCycle.startDate.getTime() - 1000), // 1 second tolerance
        lte: new Date(previousCycle.startDate.getTime() + 1000),
      },
    },
  });

  if (!cycle) {
    return {
      hasPreviousCycleEarnings: false,
      summary: null,
      cycle: {
        startDate: previousCycle.startDate,
        endDate: previousCycle.endDate,
      },
    };
  }

  // Get aggregated earnings for the previous cycle
  const aggregation = await prisma.earning.aggregate({
    where: {
      professionalId,
      cycleId: cycle.id,
      status: { in: ["pending", "confirmed", "paid"] },
    },
    _sum: {
      grossAmount: true,
      platformFeeAmount: true,
      netAmount: true,
    },
    _count: true,
  });

  const sessionsCount = aggregation._count || 0;

  if (sessionsCount === 0) {
    return {
      hasPreviousCycleEarnings: false,
      summary: null,
      cycle: {
        startDate: cycle.startDate,
        endDate: cycle.endDate,
      },
    };
  }

  return {
    hasPreviousCycleEarnings: true,
    summary: {
      grossTotal: aggregation._sum.grossAmount || 0,
      platformFeeTotal: aggregation._sum.platformFeeAmount || 0,
      netTotal: aggregation._sum.netAmount || 0,
      sessionsCount,
    },
    cycle: {
      startDate: cycle.startDate,
      endDate: cycle.endDate,
    },
  };
}
