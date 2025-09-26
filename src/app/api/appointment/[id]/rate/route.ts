/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/appointment/[id]/rate/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { transporter } from "@/lib/email";
import { sendSystemMessage } from "@/lib/messages";

const schema = z.object({
  adjustedRate: z.number().min(1, "Rate must be greater than 0"),
  note: z.string().optional(),
});

export async function PATCH(
  request: Request,
  context: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = context.params;

  try {
    const { adjustedRate, note } = schema.parse(await request.json());

    const specialistApp = await prisma.specialistApplication.findFirst({
      where: { userId: session.user.id, status: "approved" },
      select: { specialistId: true },
    });
    if (!specialistApp?.specialistId)
      return NextResponse.json(
        { error: "Not an approved specialist" },
        { status: 403 }
      );

    const appt = await prisma.appointment.findUnique({
      where: { id },
      include: { user: true, specialist: { include: { application: true } } },
    });
    if (!appt)
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    if (appt.specialistId !== specialistApp.specialistId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const prevHistory = (appt.modificationHistory as Record<string, any>) || {};

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        adjustedRate,
        modificationHistory: {
          ...prevHistory,
          [`rateChange_${new Date().toISOString()}`]: {
            oldRate: appt.adjustedRate ?? appt.rate,
            newRate: adjustedRate,
            note,
          },
        },
        adminNotes: note ?? appt.adminNotes,
      },
      include: { user: true, specialist: { include: { application: true } } },
    });

    // Email
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: updated.user.email,
      subject: "Appointment Rate Adjusted",
      text: `Rate updated to $${adjustedRate}. Note: ${note || "N/A"}`,
    });

    // System message
    const conversation = await prisma.conversation.findFirst({
      where: {
        OR: [
          {
            userId1: updated.userId,
            userId2: updated.specialist.application?.userId,
          },
          {
            userId1: updated.specialist.application?.userId,
            userId2: updated.userId,
          },
        ],
      },
    });
    if (conversation) {
      await sendSystemMessage({
        conversationId: conversation.id,
        senderId: session.user.id,
        recipientId: updated.userId,
        text: `📢 The session rate was updated to $${adjustedRate}.`,
      });
    }

    return NextResponse.json({ message: "Rate updated successfully", updated });
  } catch (err) {
    console.error("Rate update error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
