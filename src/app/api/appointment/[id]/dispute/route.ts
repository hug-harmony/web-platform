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
  context: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = context.params;
    const body = await request.json();
    const { reason } = disputeSchema.parse(body);

    const appt = await prisma.appointment.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        specialistId: true,
        date: true,
        time: true,
        status: true,
        disputeStatus: true,
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
      select: {
        id: true,
        userId: true,
        specialistId: true,
        date: true,
        time: true,
        status: true,
        disputeStatus: true,
        disputeReason: true,
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
      message: "Dispute submitted",
      appointment: {
        id: updated.id,
        specialistId: updated.specialistId,
        userId: updated.userId,
        date: updated.date.toISOString().split("T")[0],
        time: updated.time,
        status: updated.status,
        disputeStatus: updated.disputeStatus,
        disputeReason: updated.disputeReason,
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
    console.error("Dispute error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
