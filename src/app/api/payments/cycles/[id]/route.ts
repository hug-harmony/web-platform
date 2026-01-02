// src/app/api/payments/cycles/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getCycleWithStats,
  getEarningsForCycle,
} from "@/lib/services/payments";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get professional ID for the user (if they are a professional)
    const application = await prisma.professionalApplication.findUnique({
      where: { userId: session.user.id },
      select: { professionalId: true, status: true },
    });

    const professionalId =
      application?.status === "APPROVED" ? application.professionalId : null;

    // Admin can see full cycle stats
    if (session.user.isAdmin) {
      const cycle = await getCycleWithStats(id);

      if (!cycle) {
        return NextResponse.json({ error: "Cycle not found" }, { status: 404 });
      }

      return NextResponse.json(cycle);
    }

    // Professional can only see their own earnings in the cycle
    if (!professionalId) {
      return NextResponse.json(
        { error: "You must be a professional to view cycle details" },
        { status: 403 }
      );
    }

    const earnings = await getEarningsForCycle(id, professionalId);

    // Calculate summary for this professional
    const summary = earnings.reduce(
      (acc, earning) => ({
        grossTotal: acc.grossTotal + earning.grossAmount,
        platformFeeTotal: acc.platformFeeTotal + earning.platformFeeAmount,
        count: acc.count + 1,
      }),
      { grossTotal: 0, platformFeeTotal: 0, count: 0 }
    );

    return NextResponse.json({
      cycleId: id,
      earnings,
      summary,
    });
  } catch (error) {
    console.error("GET cycle by ID error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
