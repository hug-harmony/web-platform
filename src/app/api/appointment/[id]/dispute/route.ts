/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/appointment/[id]/dispute/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { sendSystemMessage } from "@/lib/messages";

const disputeSchema = z.object({
  reason: z.string().min(10, "Reason must be at least 10 characters"),
});

export async function POST(request: NextRequest, { params }: any) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;

  try {
    const { reason } = disputeSchema.parse(await request.json());

    const specialistApp = await prisma.specialistApplication.findFirst({
      where: { userId: session.user.id, status: "approved" },
      select: { specialistId: true },
    });
    if (!specialistApp?.specialistId) {
      return NextResponse.json(
        { error: "User is not an approved specialist" },
        { status: 403 }
      );
    }

    const appt = await prisma.appointment.findUnique({
      where: { id },
      include: { user: true, specialist: { include: { application: true } } },
    });
    if (!appt) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    if (appt.specialistId !== specialistApp.specialistId) {
      return NextResponse.json(
        { error: "Unauthorized: Not your appointment" },
        { status: 403 }
      );
    }

    if (appt.status !== "completed") {
      return NextResponse.json(
        { error: "Can only dispute completed appointments" },
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
      include: { user: true, specialist: { include: { application: true } } },
    });

    const userId = updated.userId;
    const specialistUserId = updated.specialist.application?.userId;
    if (!userId || !specialistUserId) {
      return NextResponse.json(
        { error: "Missing user or specialist user ID" },
        { status: 400 }
      );
    }

    const conversation = await prisma.conversation.findFirst({
      where: {
        OR: [
          {
            userId1: userId,
            userId2: specialistUserId,
          },
          {
            userId1: specialistUserId,
            userId2: userId,
          },
        ],
      },
    });

    if (conversation) {
      await sendSystemMessage({
        conversationId: conversation.id,
        senderId: session.user.id,
        recipientId: userId,
        text: `⚠️ This appointment was disputed: "${reason}"`,
      });
    }

    return NextResponse.json({
      message: "Appointment disputed successfully",
      appointment: updated,
    });
  } catch (err) {
    console.error("Dispute appointment error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
