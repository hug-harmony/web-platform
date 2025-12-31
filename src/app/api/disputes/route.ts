// src\app\api\disputes\route.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable prefer-const */
import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const disputeActionSchema = z.object({
  action: z.enum(["confirm_cancel", "deny"]),
  notes: z.string().optional(),
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid appointment ID"),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const disputes = await prisma.appointment.findMany({
      where: {
        disputeStatus: "disputed",
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, phoneNumber: true },
        },
        professional: {
          select: {
            id: true,
            name: true,
            applications: {
              select: {
                user: { select: { name: true, email: true } },
              },
            },
          },
        },
        payment: {
          select: { id: true, amount: true, status: true, stripeId: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(disputes);
  } catch (error) {
    console.error("Fetch disputes error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, notes, id } = disputeActionSchema.parse(body);

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { payment: true },
    });

    if (!appointment || appointment.disputeStatus !== "disputed") {
      return NextResponse.json(
        { error: "Dispute not found or not pending" },
        { status: 404 }
      );
    }

    let updatedData: any = {
      adminNotes: notes || null,
      disputeStatus:
        action === "confirm_cancel" ? "confirmed_canceled" : "denied",
    };

    let restoredSlotInfo: {
      date: string;
      time: string;
      dayOfWeek: string;
    } | null = null;

    if (action === "confirm_cancel") {
      updatedData.status = "canceled";

      // Handle payment refund if paid
      if (appointment.payment && appointment.payment.status === "successful") {
        await prisma.payment.update({
          where: { id: appointment.payment.id },
          data: { status: "refunded" },
        });
      }

      // Extract date & time for UI
      const dateObj = appointment.startTime;
      const dayOfWeekNum = dateObj.getDay();
      const dayOfWeekName = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ][dayOfWeekNum];

      const formattedDate = dateObj.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }); // e.g. "Wednesday, April 5, 2025"

      const slotTime = `${dateObj
        .getHours()
        .toString()
        .padStart(2, "0")}:${dateObj.getMinutes().toString().padStart(2, "0")}`; // e.g. "14:30"

      // Restore slot to weekly availability
      await prisma.availability.upsert({
        where: {
          professionalId_dayOfWeek: {
            professionalId: appointment.professionalId,
            dayOfWeek: dayOfWeekNum,
          },
        },
        update: {
          slots: {
            push: slotTime,
          },
        },
        create: {
          professionalId: appointment.professionalId,
          dayOfWeek: dayOfWeekNum,
          slots: [slotTime],
          breakDuration: 30,
        },
      });

      // Attach to response for UI
      restoredSlotInfo = {
        date: formattedDate,
        time: slotTime,
        dayOfWeek: dayOfWeekName,
      };
    } else {
      updatedData.status = "completed";
    }

    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: updatedData,
      include: {
        user: { select: { name: true, email: true } },
        professional: { select: { name: true } },
        payment: { select: { status: true } },
      },
    });

    return NextResponse.json({
      message: `Dispute ${action === "confirm_cancel" ? "confirmed and canceled" : "denied"}`,
      appointment: updatedAppointment,
      ...(restoredSlotInfo && { restoredSlotInfo }),
    });
  } catch (error) {
    console.error("Handle dispute error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
