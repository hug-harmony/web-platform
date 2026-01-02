// src/app/api/admin/payments/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getAllCyclesWithStats,
  getDisputedConfirmations,
  getFeeChargeSummaryForAdmin,
  getCycleWithStats,
  getBlockedProfessionals,
  getConfirmationStatsForCycle,
} from "@/lib/services/payments";
import { CycleStatus } from "@/types/payments";
import { z } from "zod";

const querySchema = z.object({
  view: z
    .enum(["overview", "cycles", "disputes", "blocked"])
    .optional()
    .default("overview"),
  cycleId: z.string().optional(),
  status: z
    .enum(["active", "confirming", "processing", "completed", "failed"])
    .optional(),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(50).optional().default(10),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session.user.isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized: Admin access required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const params = querySchema.parse({
      view: searchParams.get("view") || "overview",
      cycleId: searchParams.get("cycleId") || undefined,
      status: searchParams.get("status") || undefined,
      page: searchParams.get("page") || 1,
      limit: searchParams.get("limit") || 10,
    });

    switch (params.view) {
      case "overview": {
        const [currentCycleResult, disputes, feeChargeSummary, blockedPros] =
          await Promise.all([
            getAllCyclesWithStats({ limit: 1 }),
            getDisputedConfirmations(),
            getFeeChargeSummaryForAdmin(),
            getBlockedProfessionals(),
          ]);

        const currentCycle = currentCycleResult.cycles[0] || null;

        // Get confirmation stats for current cycle if exists
        let confirmationStats = null;
        if (currentCycle) {
          confirmationStats = await getConfirmationStatsForCycle(
            currentCycle.id
          );
        }

        return NextResponse.json({
          currentCycle,
          confirmationStats,
          pendingDisputes: disputes.length,
          disputes: disputes.slice(0, 5),
          feeChargeSummary,
          blockedProfessionals: blockedPros,
          blockedCount: blockedPros.length,
        });
      }

      case "cycles": {
        // Get specific cycle if ID provided
        if (params.cycleId) {
          const cycle = await getCycleWithStats(params.cycleId);
          if (!cycle) {
            return NextResponse.json(
              { error: "Cycle not found" },
              { status: 404 }
            );
          }

          const confirmationStats = await getConfirmationStatsForCycle(
            params.cycleId
          );
          const feeChargeSummary = await getFeeChargeSummaryForAdmin(
            params.cycleId
          );

          return NextResponse.json({
            cycle,
            confirmationStats,
            feeChargeSummary,
          });
        }

        // Get all cycles
        const result = await getAllCyclesWithStats({
          status: params.status as CycleStatus | undefined,
          limit: params.limit,
          offset: (params.page - 1) * params.limit,
        });

        return NextResponse.json({
          data: result.cycles,
          total: result.total,
          page: params.page,
          limit: params.limit,
          hasMore: params.page * params.limit < result.total,
        });
      }

      case "disputes": {
        const disputes = await getDisputedConfirmations();
        return NextResponse.json({
          data: disputes,
          total: disputes.length,
        });
      }

      case "blocked": {
        const blockedPros = await getBlockedProfessionals();
        return NextResponse.json({
          data: blockedPros,
          total: blockedPros.length,
        });
      }

      default:
        return NextResponse.json(
          { error: "Invalid view parameter" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("GET admin payments error:", error);

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
