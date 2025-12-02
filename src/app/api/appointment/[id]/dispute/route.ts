// File: src/app/api/appointment/[id]/dispute/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const disputeSchema = z.object({
  reason: z.string().min(1, "Dispute reason is required"),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { reason } = disputeSchema.parse(body);

    const appt = await prisma.appointment.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        startTime: true,
        endTime: true,
        status: true,
        disputeStatus: true,
      },
    });

    if (!appt) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    if (appt.userId !== session.user.id && !session.user.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (appt.status === "cancelled") {
      return NextResponse.json(
        { error: "Cannot dispute a cancelled appointment" },
        { status: 400 }
      );
    }

    if (appt.disputeStatus !== "none") {
      return NextResponse.json(
        { error: "Appointment already disputed" },
        { status: 400 }
      );
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        status: "disputed",
        disputeReason: reason,
        disputeStatus: "disputed",
      },
    });

    return NextResponse.json({
      message: "Dispute submitted",
      appointment: updated,
    });
  } catch (error) {
    console.error("Dispute error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
