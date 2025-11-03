// File: app/api/specialists/booking/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

/**
 * Creates a new appointment + 30-min buffer (as 'break' appointment)
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

    // --- Check for overlap with any appointment or buffer ---
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

    // --- Create main appointment ---
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

    // --- Create 30-min buffer as 'break' appointment ---
    const bufferStart = new Date(end);
    const bufferEnd = new Date(bufferStart.getTime() + 30 * 60 * 1000);

    await prisma.appointment.create({
      data: {
        specialistId,
        userId: null, // No user
        startTime: bufferStart,
        endTime: bufferEnd,
        status: "break",
      },
    });

    return NextResponse.json(
      { appointment: newAppointment, bufferCreated: true },
      { status: 201 }
    );
  } catch (error) {
    console.error("Booking POST error:", error);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}
