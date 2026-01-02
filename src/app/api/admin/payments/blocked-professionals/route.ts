// src/app/api/admin/payments/blocked-professionals/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getBlockedProfessionals,
  unblockProfessional,
  waiveFeeCharge,
} from "@/lib/services/payments";
import { z } from "zod";

const unblockSchema = z.object({
  professionalId: z.string().min(1),
});

const waiveSchema = z.object({
  feeChargeId: z.string().min(1),
  reason: z.string().min(1).max(500),
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

    const blockedPros = await getBlockedProfessionals();

    return NextResponse.json({
      data: blockedPros,
      total: blockedPros.length,
    });
  } catch (error) {
    console.error("GET blocked professionals error:", error);
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
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (action === "unblock") {
      const { professionalId } = unblockSchema.parse(body);
      await unblockProfessional(professionalId);

      return NextResponse.json({
        message: "Professional unblocked successfully",
        professionalId,
      });
    }

    if (action === "waive") {
      const { feeChargeId, reason } = waiveSchema.parse(body);
      const result = await waiveFeeCharge(feeChargeId, session.user.id, reason);

      return NextResponse.json({
        message: "Fee charge waived successfully",
        feeCharge: result,
      });
    }

    return NextResponse.json(
      { error: "Invalid action. Use ?action=unblock or ?action=waive" },
      { status: 400 }
    );
  } catch (error) {
    console.error("POST blocked professionals action error:", error);

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
