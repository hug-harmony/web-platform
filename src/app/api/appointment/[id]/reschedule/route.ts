// File: app/api/appointment/[id]/reschedule/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  note: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = context.params.id;
    const body = await request.json();
    const { startTime, endTime, note } = schema.parse(body);

    const newStartTime = new Date(startTime);
    const newEndTime = new Date(endTime);

    if (newStartTime >= newEndTime) {
      return NextResponse.json(
        { error: "Start time must be before end time." },
        { status: 400 }
      );
    }

    // Step 1: Fetch the appointment to get its specialistId for authorization
    const appt = await prisma.appointment.findUnique({
      where: { id },
      select: {
        specialistId: true, // <-- Crucial for authorization check
        startTime: true,
        endTime: true,
        modificationHistory: true,
        adminNotes: true,
      },
    });

    if (!appt) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    // Step 2: Perform flexible authorization
    if (!session.user.isAdmin) {
      // If not an admin, check if they are the correct specialist
      const specialistProfile = await prisma.specialistApplication.findFirst({
        where: { userId: session.user.id, status: "approved" },
        select: { specialistId: true },
      });

      // Deny access if they are not a specialist or not the specialist on this appointment
      if (
        !specialistProfile ||
        specialistProfile.specialistId !== appt.specialistId
      ) {
        return NextResponse.json(
          {
            error:
              "Forbidden: You do not have permission to reschedule this appointment.",
          },
          { status: 403 }
        );
      }
    }
    // If the check passes (either admin or correct specialist), continue.

    const prevHistory =
      appt.modificationHistory && typeof appt.modificationHistory === "object"
        ? appt.modificationHistory
        : {};

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        startTime: newStartTime,
        endTime: newEndTime,
        modificationHistory: {
          ...prevHistory,
          [`reschedule_${new Date().toISOString()}`]: {
            oldStartTime: appt.startTime,
            oldEndTime: appt.endTime,
            newStartTime: newStartTime,
            newEndTime: newEndTime,
            note,
            changedBy: session.user.id,
          },
        },
        adminNotes: note
          ? `${appt.adminNotes || ""}\nReschedule Note: ${note}`.trim()
          : appt.adminNotes,
      },
    });

    return NextResponse.json({
      message: "Appointment rescheduled successfully",
      appointment: updated,
    });
  } catch (error) {
    console.error("Reschedule error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
