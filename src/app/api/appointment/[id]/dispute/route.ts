// app/api/appointments/[id]/dispute/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const disputeSchema = z.object({
  reason: z.string().min(10, "Reason must be at least 10 characters"),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
    return NextResponse.json(
      { error: "Invalid appointment ID" },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const { reason } = disputeSchema.parse(body);

    // Verify the appointment belongs to the specialist
    const specialistApplication = await prisma.specialistApplication.findFirst({
      where: {
        userId: session.user.id,
        status: "approved",
      },
      select: { specialistId: true },
    });

    if (!specialistApplication?.specialistId) {
      return NextResponse.json(
        { error: "User is not an approved specialist" },
        { status: 403 }
      );
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { specialist: true },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    if (appointment.specialistId !== specialistApplication.specialistId) {
      return NextResponse.json(
        { error: "Unauthorized: Not your appointment" },
        { status: 403 }
      );
    }

    if (appointment.status !== "completed") {
      return NextResponse.json(
        { error: "Can only dispute completed appointments" },
        { status: 400 }
      );
    }

    if (appointment.disputeStatus !== "none") {
      return NextResponse.json(
        { error: "Appointment already disputed" },
        { status: 400 }
      );
    }

    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: {
        status: "disputed",
        disputeReason: reason,
        disputeStatus: "disputed",
      },
      include: {
        user: { select: { name: true, email: true } },
        specialist: { select: { name: true } },
      },
    });

    return NextResponse.json({
      message: "Appointment disputed successfully",
      appointment: updatedAppointment,
    });
  } catch (error) {
    console.error("Dispute appointment error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
