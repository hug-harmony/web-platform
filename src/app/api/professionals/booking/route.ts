// src/app/api/professionals/booking/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

const BUFFER_MINUTES = 30;

/**
 * Creates a new appointment (buffer is handled dynamically, not stored)
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { professionalId, startTime, endTime, userId, venue } = body as {
    professionalId?: string;
    startTime?: string;
    endTime?: string;
    userId?: string;
    venue?: "host" | "visit";
  };

  if (!professionalId || !startTime || !endTime || !userId) {
    return NextResponse.json(
      {
        error:
          "Missing required booking details: professionalId, startTime, endTime, or userId",
      },
      { status: 400 }
    );
  }

  if (session.user.id !== userId) {
    return NextResponse.json(
      { error: "Forbidden: User ID does not match session" },
      { status: 403 }
    );
  }

  const start = new Date(startTime);
  const end = new Date(endTime);

  if (start >= end || start < new Date()) {
    return NextResponse.json(
      { error: "Invalid booking time range" },
      { status: 400 }
    );
  }

  try {
    const professional = await prisma.professional.findUnique({
      where: { id: professionalId },
      select: { venue: true, rate: true },
    });

    if (!professional) {
      return NextResponse.json(
        { error: "Professional not found" },
        { status: 404 }
      );
    }

    // Venue validation
    let finalVenue: "host" | "visit";
    if (professional.venue === "host" || professional.venue === "visit") {
      finalVenue = professional.venue;
    } else if (professional.venue === "both") {
      if (!venue) {
        return NextResponse.json({ error: "VENUE_REQUIRED" }, { status: 400 });
      }
      finalVenue = venue;
    } else {
      return NextResponse.json(
        { error: "Invalid professional venue configuration" },
        { status: 500 }
      );
    }

    /* ---- OVERLAP CHECK (includes buffer consideration) ---- */
    const bufferMs = BUFFER_MINUTES * 60 * 1000;

    // Check 1: Does new booking overlap with any existing appointment?
    const overlappingAppointment = await prisma.appointment.findFirst({
      where: {
        professionalId,
        status: { in: ["upcoming", "pending"] },
        startTime: { lt: end },
        endTime: { gt: start },
      },
    });

    if (overlappingAppointment) {
      return NextResponse.json(
        {
          error: "SLOT_ALREADY_BOOKED",
          message: "This time slot overlaps with an existing appointment.",
        },
        { status: 409 }
      );
    }

    // Check 2: Does new booking start during an existing appointment's buffer?
    // (i.e., new booking starts within 30 min after an existing appointment ends)
    const appointmentWithBufferConflict = await prisma.appointment.findFirst({
      where: {
        professionalId,
        status: { in: ["upcoming", "pending"] },
        endTime: {
          gt: new Date(start.getTime() - bufferMs), // Appointment ended within 30 min before new start
          lte: start, // Appointment ended before or exactly at new start
        },
      },
    });

    if (appointmentWithBufferConflict) {
      return NextResponse.json(
        {
          error: "BUFFER_CONFLICT",
          message:
            "This time slot falls within a 30-minute buffer after another appointment.",
        },
        { status: 409 }
      );
    }

    // Check 3: Does new booking's buffer overlap with next appointment?
    // (i.e., there's an appointment starting within 30 min after new booking ends)
    const newBookingBufferEnd = new Date(end.getTime() + bufferMs);
    const nextAppointmentConflict = await prisma.appointment.findFirst({
      where: {
        professionalId,
        status: { in: ["upcoming", "pending"] },
        startTime: {
          gte: end, // Starts after new booking ends
          lt: newBookingBufferEnd, // But within new booking's buffer
        },
      },
    });

    if (nextAppointmentConflict) {
      return NextResponse.json(
        {
          error: "BUFFER_CONFLICT",
          message:
            "This booking's buffer would overlap with the next appointment. Please choose an earlier time or shorter duration.",
        },
        { status: 409 }
      );
    }

    /* ---- CREATE APPOINTMENT (no buffer record) ---- */
    const newAppointment = await prisma.appointment.create({
      data: {
        userId,
        professionalId,
        startTime: start,
        endTime: end,
        status: "upcoming",
        venue: finalVenue,
        rate: professional.rate,
      },
    });

    return NextResponse.json({ appointment: newAppointment }, { status: 201 });
  } catch (error) {
    console.error("Booking POST error:", error);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}
