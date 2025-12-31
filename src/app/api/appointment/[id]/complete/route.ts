// src/app/api/appointment/[id]/complete/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createConfirmation } from "@/lib/services/payments";

/**
 * This endpoint is called when an appointment is marked as completed
 * Either automatically (when time passes) or manually
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get appointment
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        professional: {
          include: {
            applications: {
              where: { status: "APPROVED" },
              select: { userId: true },
            },
          },
        },
      },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    // Verify user is part of this appointment or is admin
    const isClient = appointment.userId === session.user.id;
    const isProfessional =
      appointment.professional?.applications[0]?.userId === session.user.id;
    const isAdmin = session.user.isAdmin;

    if (!isClient && !isProfessional && !isAdmin) {
      return NextResponse.json(
        { error: "You are not a participant in this appointment" },
        { status: 403 }
      );
    }

    // Check if appointment time has passed
    if (appointment.endTime > new Date() && !isAdmin) {
      return NextResponse.json(
        { error: "Appointment has not ended yet" },
        { status: 400 }
      );
    }

    // Check if already completed
    if (appointment.status === "completed") {
      // Just return existing confirmation if any
      const existingConfirmation =
        await prisma.appointmentConfirmation.findUnique({
          where: { appointmentId: id },
        });

      return NextResponse.json({
        message: "Appointment already completed",
        confirmation: existingConfirmation,
      });
    }

    // Update appointment status
    await prisma.appointment.update({
      where: { id },
      data: { status: "completed" },
    });

    // Create confirmation record
    const confirmation = await createConfirmation(id);

    return NextResponse.json({
      message:
        "Appointment marked as completed. Please confirm if the session occurred.",
      confirmation,
    });
  } catch (error) {
    console.error("POST complete appointment error:", error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
