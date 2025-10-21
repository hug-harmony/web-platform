// app/api/appointment/[id]/reschedule/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().min(1),
  note: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { date, time, note } = schema.parse(body);

    const appt = await prisma.appointment.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        specialistId: true,
        date: true,
        time: true,
        status: true,
        rate: true,
        adjustedRate: true,
        adminNotes: true,
        modificationHistory: true,
        venue: true,
        user: {
          select: { id: true, name: true, firstName: true, lastName: true },
        },
        specialist: {
          select: {
            name: true,
            rate: true,
            venue: true,
            application: {
              select: {
                userId: true,
                user: {
                  select: { name: true, firstName: true, lastName: true },
                },
              },
            },
          },
        },
      },
    });

    if (!appt) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    const prevHistory =
      appt.modificationHistory && typeof appt.modificationHistory === "object"
        ? appt.modificationHistory
        : {};

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
      select: {
        id: true,
        userId: true,
        specialistId: true,
        date: true,
        time: true,
        status: true,
        rate: true,
        adjustedRate: true,
        adminNotes: true,
        modificationHistory: true,
        venue: true,
        user: {
          select: { id: true, name: true, firstName: true, lastName: true },
        },
        specialist: {
          select: {
            name: true,
            rate: true,
            venue: true,
            application: {
              select: {
                userId: true,
                user: {
                  select: { name: true, firstName: true, lastName: true },
                },
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      message: "Appointment rescheduled",
      appointment: {
        id: updated.id,
        userId: updated.userId,
        specialistId: updated.specialistId,
        date: updated.date.toISOString().split("T")[0],
        time: updated.time,
        venue: updated.venue,
        specialistName:
          updated.specialist?.name ||
          (updated.specialist?.application?.user
            ? `${updated.specialist.application.user.firstName || ""} ${updated.specialist.application.user.lastName || ""}`.trim() ||
              updated.specialist.application.user.name ||
              "Unknown Specialist"
            : "Unknown Specialist"),
      },
    });
  } catch (error) {
    console.error("Reschedule error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
