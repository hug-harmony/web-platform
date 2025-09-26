/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/appointment/[id]/reschedule/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { transporter } from "@/lib/email";
import { sendSystemMessage } from "@/lib/messages";

const schema = z.object({
  date: z.string(), // ISO
  time: z.string(),
  note: z.string().optional(),
});

export async function PATCH(request: NextRequest, { params }: any) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = params;

  try {
    const { date, time, note } = schema.parse(await request.json());

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
    if (["completed", "cancelled", "disputed"].includes(appt.status))
      return NextResponse.json(
        { error: "Cannot reschedule this appointment" },
        { status: 400 }
      );

    const prevHistory = (appt.modificationHistory as Record<string, any>) || {};

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        date: new Date(date),
        time,
        modificationHistory: {
          ...prevHistory,
          [`reschedule_${new Date().toISOString()}`]: {
            oldDate: appt.date,
            oldTime: appt.time,
            newDate: date,
            newTime: time,
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
      subject: "Appointment Rescheduled",
      text: `Your appointment has been rescheduled to ${new Date(date).toDateString()} at ${time}. Note: ${note || "N/A"}`,
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
        text: `📅 Your appointment was rescheduled to ${new Date(date).toDateString()} at ${time}.`,
      });
    }

    return NextResponse.json({
      message: "Appointment rescheduled successfully",
      updated,
    });
  } catch (err) {
    console.error("Reschedule error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
