// app/api/appointment/[id]/rate/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  adjustedRate: z.number().min(0),
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
    const { adjustedRate, note } = schema.parse(body);

    const appt = await prisma.appointment.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        specialistId: true,
        date: true,
        time: true,
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
      select: {
        id: true,
        userId: true,
        specialistId: true,
        date: true,
        time: true,
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
      message: "Rate updated",
      appointment: {
        id: updated.id,
        userId: updated.userId,
        specialistId: updated.specialistId,
        date: updated.date.toISOString().split("T")[0],
        time: updated.time,
        rate: updated.rate,
        adjustedRate: updated.adjustedRate,
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
    console.error("Rate update error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
