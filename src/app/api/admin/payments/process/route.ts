// src/app/api/admin/payments/process/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  processAllReadyCycles,
  createPayoutsForCycle,
  processPayoutsForCycle,
  getCyclesReadyForProcessing,
} from "@/lib/services/payments";
import { z } from "zod";

const processSchema = z.object({
  action: z.enum(["process_all", "process_cycle", "create_payouts"]),
  cycleId: z.string().optional(),
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

    // Get cycles ready for processing
    const readyCycles = await getCyclesReadyForProcessing();

    return NextResponse.json({
      readyCycles: readyCycles.map((cycle) => ({
        id: cycle.id,
        startDate: cycle.startDate,
        endDate: cycle.endDate,
        cutoffDate: cycle.cutoffDate,
        status: cycle.status,
      })),
      count: readyCycles.length,
    });
  } catch (error) {
    console.error("GET ready cycles error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session.user.isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized: Admin access required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, cycleId } = processSchema.parse(body);

    switch (action) {
      case "process_all": {
        const result = await processAllReadyCycles();
        return NextResponse.json({
          message: "Processed all ready cycles",
          ...result,
        });
      }

      case "create_payouts": {
        if (!cycleId) {
          return NextResponse.json(
            { error: "cycleId is required for create_payouts action" },
            { status: 400 }
          );
        }

        const result = await createPayoutsForCycle(cycleId);
        return NextResponse.json({
          message: "Created payouts for cycle",
          cycleId,
          ...result,
        });
      }

      case "process_cycle": {
        if (!cycleId) {
          return NextResponse.json(
            { error: "cycleId is required for process_cycle action" },
            { status: 400 }
          );
        }

        const result = await processPayoutsForCycle(cycleId);
        return NextResponse.json({
          message: "Processed payouts for cycle",
          cycleId,
          ...result,
        });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("POST process payouts error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
