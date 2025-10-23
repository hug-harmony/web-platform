// File: app/api/specialists/booking/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

/**
 * Creates a new appointment based on a start and end time.
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { specialistId, startTime, endTime, userId, venue } = body as {
    specialistId?: string;
    startTime?: string;
    endTime?: string;
    userId?: string;
    venue?: "host" | "visit";
  };

  if (!specialistId || !startTime || !endTime || !userId) {
    return NextResponse.json(
      {
        error:
          "Missing required booking details: specialistId, startTime, endTime, or userId",
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
    const specialist = await prisma.specialist.findUnique({
      where: { id: specialistId },
      select: { venue: true, rate: true },
    });

    if (!specialist) {
      return NextResponse.json(
        { error: "Specialist not found" },
        { status: 404 }
      );
    }

    let finalVenue: "host" | "visit";
    if (specialist.venue === "host" || specialist.venue === "visit") {
      finalVenue = specialist.venue;
    } else if (specialist.venue === "both") {
      if (!venue) {
        return NextResponse.json({ error: "VENUE_REQUIRED" }, { status: 400 });
      }
      finalVenue = venue;
    } else {
      return NextResponse.json(
        { error: "Invalid specialist venue configuration" },
        { status: 500 }
      );
    }

    const overlappingAppointment = await prisma.appointment.findFirst({
      where: {
        specialistId,
        status: { in: ["upcoming", "pending", "break"] },
        startTime: { lt: end },
        endTime: { gt: start },
      },
    });

    if (overlappingAppointment) {
      return NextResponse.json(
        {
          error: "SLOT_ALREADY_BOOKED",
          message: "This time slot is no longer available.",
        },
        { status: 409 }
      );
    }

    // --- NEW: Check if proposed booking overlaps with any 30-min buffer ---
    const dayStart = new Date(start);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(start);
    dayEnd.setHours(23, 59, 59, 999);

    const dayAppointments = await prisma.appointment.findMany({
      where: {
        specialistId,
        status: { in: ["upcoming", "pending", "break"] },
        startTime: { gte: dayStart, lte: dayEnd },
      },
      orderBy: { startTime: "asc" },
    });

    let hasBufferViolation = false;

    for (let i = 0; i < dayAppointments.length - 1; i++) {
      const curr = dayAppointments[i];
      const bufferStart = new Date(curr.endTime);
      const bufferEnd = new Date(bufferStart.getTime() + 30 * 60 * 1000);

      // Check if new booking overlaps with this buffer
      if (start < bufferEnd && end > bufferStart) {
        hasBufferViolation = true;
        break;
      }
    }

    if (hasBufferViolation) {
      return NextResponse.json(
        {
          error: "INVALID_TIME_BUFFER",
          message:
            "Cannot book during or across the 30-minute buffer between sessions.",
        },
        { status: 409 }
      );
    }

    const newAppointment = await prisma.appointment.create({
      data: {
        userId,
        specialistId,
        startTime: start,
        endTime: end,
        status: "upcoming",
        venue: finalVenue,
        rate: specialist.rate,
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
