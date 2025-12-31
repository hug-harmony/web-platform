// src/app/api/payments/payouts/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getPayoutsForProfessional,
  getUpcomingPayoutEstimate,
} from "@/lib/services/payments";
import prisma from "@/lib/prisma";
import { PayoutStatus } from "@/types/payments";
import { z } from "zod";

const querySchema = z.object({
  status: z.enum(["pending", "processing", "completed", "failed"]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(50).optional().default(10),
  upcoming: z.enum(["true", "false"]).optional(),
});

export async function GET(request: NextRequest) {
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
        { error: "You must be an approved professional to view payouts" },
        { status: 403 }
      );
    }

    const professionalId = application.professionalId;

    // Parse query params
    const { searchParams } = new URL(request.url);
    const params = querySchema.parse({
      status: searchParams.get("status") || undefined,
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      page: searchParams.get("page") || 1,
      limit: searchParams.get("limit") || 10,
      upcoming: searchParams.get("upcoming") || undefined,
    });

    // Get upcoming payout estimate
    if (params.upcoming === "true") {
      const estimate = await getUpcomingPayoutEstimate(professionalId);
      return NextResponse.json({ upcoming: estimate });
    }

    // Get payout history
    const payouts = await getPayoutsForProfessional(professionalId, {
      status: params.status as PayoutStatus | undefined,
      startDate: params.startDate ? new Date(params.startDate) : undefined,
      endDate: params.endDate ? new Date(params.endDate) : undefined,
      page: params.page,
      limit: params.limit,
    });

    return NextResponse.json(payouts);
  } catch (error) {
    console.error("GET payouts error:", error);

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
