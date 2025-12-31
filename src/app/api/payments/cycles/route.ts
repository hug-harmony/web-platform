// src/app/api/payments/cycles/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getOrCreateCurrentCycle,
  getCurrentCycleInfo,
  getCyclesForProfessional,
  getCycleCountForProfessional,
} from "@/lib/services/payments";
import prisma from "@/lib/prisma";
import { z } from "zod";

const querySchema = z.object({
  current: z.enum(["true", "false"]).optional(),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(50).optional().default(10),
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
        { error: "You must be an approved professional to view cycles" },
        { status: 403 }
      );
    }

    const professionalId = application.professionalId;

    // Parse query params
    const { searchParams } = new URL(request.url);
    const params = querySchema.parse({
      current: searchParams.get("current") || undefined,
      page: searchParams.get("page") || 1,
      limit: searchParams.get("limit") || 10,
    });

    // If requesting current cycle info
    if (params.current === "true") {
      const cycleInfo = await getCurrentCycleInfo();
      return NextResponse.json(cycleInfo);
    }

    // Get cycles for this professional
    const [cycles, total] = await Promise.all([
      getCyclesForProfessional(professionalId, {
        limit: params.limit,
        offset: (params.page - 1) * params.limit,
      }),
      getCycleCountForProfessional(professionalId),
    ]);

    return NextResponse.json({
      data: cycles,
      total,
      page: params.page,
      limit: params.limit,
      hasMore: params.page * params.limit < total,
    });
  } catch (error) {
    console.error("GET cycles error:", error);

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
