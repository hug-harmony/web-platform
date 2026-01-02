// src/app/api/payments/fee-charges/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getFeeChargeById } from "@/lib/services/payments";
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

    const feeCharge = await getFeeChargeById(id);

    if (!feeCharge) {
      return NextResponse.json(
        { error: "Fee charge not found" },
        { status: 404 }
      );
    }

    // Verify user has access to this fee charge
    const application = await prisma.professionalApplication.findUnique({
      where: { userId: session.user.id },
      select: { professionalId: true },
    });

    const isOwner = application?.professionalId === feeCharge.professionalId;
    const isAdmin = session.user.isAdmin;

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: "You don't have permission to view this fee charge" },
        { status: 403 }
      );
    }

    return NextResponse.json(feeCharge);
  } catch (error) {
    console.error("GET fee charge by ID error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
