// src/app/api/admin/payments/process/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getCyclesReadyForAutoConfirm,
  getCyclesReadyForFeeCollection,
  createFeeChargesForCycle,
  processFeeChargesForCycle,
  retryFailedFeeCharges,
  runAutoConfirmTask,
  runFeeCollectionTask,
} from "@/lib/services/payments";
import { z } from "zod";

const processSchema = z.object({
  action: z.enum([
    "check_ready",
    "auto_confirm",
    "create_charges",
    "process_charges",
    "retry_failed",
    "full_collection",
  ]),
  cycleId: z.string().optional(),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session.user.isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized: Admin access required" },
        { status: 401 }
      );
    }

    // Get cycles ready for various stages
    const [readyForAutoConfirm, readyForFeeCollection] = await Promise.all([
      getCyclesReadyForAutoConfirm(),
      getCyclesReadyForFeeCollection(),
    ]);

    return NextResponse.json({
      readyForAutoConfirm: readyForAutoConfirm.map((cycle) => ({
        id: cycle.id,
        startDate: cycle.startDate,
        endDate: cycle.endDate,
        confirmationDeadline: cycle.confirmationDeadline,
        status: cycle.status,
      })),
      readyForFeeCollection: readyForFeeCollection.map((cycle) => ({
        id: cycle.id,
        startDate: cycle.startDate,
        endDate: cycle.endDate,
        status: cycle.status,
      })),
      autoConfirmCount: readyForAutoConfirm.length,
      feeCollectionCount: readyForFeeCollection.length,
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
      case "check_ready": {
        const [readyForAutoConfirm, readyForFeeCollection] = await Promise.all([
          getCyclesReadyForAutoConfirm(),
          getCyclesReadyForFeeCollection(),
        ]);

        return NextResponse.json({
          autoConfirmCount: readyForAutoConfirm.length,
          feeCollectionCount: readyForFeeCollection.length,
        });
      }

      case "auto_confirm": {
        const result = await runAutoConfirmTask();
        return NextResponse.json({
          message: "Auto-confirm task completed",
          ...result,
        });
      }

      case "create_charges": {
        if (!cycleId) {
          return NextResponse.json(
            { error: "cycleId is required for create_charges action" },
            { status: 400 }
          );
        }

        const result = await createFeeChargesForCycle(cycleId);
        return NextResponse.json({
          message: "Created fee charges for cycle",
          cycleId,
          ...result,
        });
      }

      case "process_charges": {
        if (!cycleId) {
          return NextResponse.json(
            { error: "cycleId is required for process_charges action" },
            { status: 400 }
          );
        }

        const result = await processFeeChargesForCycle(cycleId);
        return NextResponse.json({
          message: "Processed fee charges for cycle",
          cycleId,
          ...result,
        });
      }

      case "retry_failed": {
        const result = await retryFailedFeeCharges();
        return NextResponse.json({
          message: "Retried failed fee charges",
          ...result,
        });
      }

      case "full_collection": {
        const result = await runFeeCollectionTask(cycleId);
        return NextResponse.json({
          message: cycleId
            ? "Fee collection completed for cycle"
            : "Fee collection completed for all ready cycles",
          cycleId,
          ...result,
        });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("POST process payments error:", error);

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
