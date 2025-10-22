/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable prefer-const */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const disputeActionSchema = z.object({
  action: z.enum(["confirm_cancel", "deny"]),
  notes: z.string().optional(),
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
        specialist: {
          select: {
            id: true,
            name: true,
            application: {
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resolvedParams = await params;
  const id = resolvedParams.id;
  if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
    return NextResponse.json(
      { error: "Invalid appointment ID" },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const { action, notes } = disputeActionSchema.parse(body);

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

    if (action === "confirm_cancel") {
      updatedData.status = "canceled";

      // Handle payment refund if paid
      if (appointment.payment && appointment.payment.status === "successful") {
        // In production, integrate with Stripe refund API
        await prisma.payment.update({
          where: { id: appointment.payment.id },
          data: { status: "refunded" },
        });
      }

      // Add slot back to availability
      const availabilityDate = appointment.startTime
        .toISOString()
        .split("T")[0];
      const slotTime = `${appointment.startTime.getHours().toString().padStart(2, "0")}:${appointment.startTime.getMinutes().toString().padStart(2, "0")}`;

      await prisma.availability.upsert({
        where: {
          specialistId_date: {
            specialistId: appointment.specialistId,
            date: new Date(availabilityDate),
          },
        },
        update: {
          slots: {
            push: slotTime,
          },
        },
        create: {
          specialistId: appointment.specialistId,
          date: new Date(availabilityDate),
          slots: [slotTime],
          breakDuration: 30, // Default value, adjust as needed
        },
      });
    } else {
      updatedData.status = "completed";
    }

    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: updatedData,
      include: {
        user: { select: { name: true, email: true } },
        specialist: { select: { name: true } },
        payment: { select: { status: true } },
      },
    });

    return NextResponse.json({
      message: `Dispute ${action === "confirm_cancel" ? "confirmed and canceled" : "denied"}`,
      appointment: updatedAppointment,
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
