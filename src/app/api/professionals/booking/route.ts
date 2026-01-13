// src/app/api/professionals/booking/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { format } from "date-fns";
import { sendAppointmentBookedEmails } from "@/lib/services/email";

const BUFFER_MINUTES = 30;

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
    venue?: "host" | "visit" | "video";
  };

  if (!professionalId || !startTime || !endTime || !userId) {
    return NextResponse.json(
      { error: "Missing required booking details" },
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
    // Get professional with user info for email
    const professional = await prisma.professional.findUnique({
      where: { id: professionalId },
      select: {
        venue: true,
        rate: true,
        offersVideo: true,
        videoRate: true,
        name: true,
        applications: {
          where: { status: "APPROVED" },
          select: {
            user: {
              select: {
                email: true,
                firstName: true,
                lastName: true,
                name: true,
              },
            },
          },
          take: 1,
        },
      },
    });

    if (!professional) {
      return NextResponse.json(
        { error: "Professional not found" },
        { status: 404 }
      );
    }

    // Get client info for email
    const client = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true, lastName: true, name: true },
    });

    if (!client) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Venue validation
    let finalVenue: "host" | "visit" | "video";

    if (venue === "video") {
      if (!professional.offersVideo) {
        return NextResponse.json({ error: "VIDEO_NOT_OFFERED" }, { status: 400 });
      }
      finalVenue = "video";
    } else if (professional.venue === "host" || professional.venue === "visit") {
      finalVenue = professional.venue;
    } else if (professional.venue === "both") {
      if (!venue) {
        return NextResponse.json({ error: "VENUE_REQUIRED" }, { status: 400 });
      }
      finalVenue = venue as "host" | "visit";
    } else {
      return NextResponse.json(
        { error: "Invalid professional venue configuration" },
        { status: 500 }
      );
    }

    // Overlap checks
    const bufferMs = BUFFER_MINUTES * 60 * 1000;

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

    const appointmentWithBufferConflict = await prisma.appointment.findFirst({
      where: {
        professionalId,
        status: { in: ["upcoming", "pending"] },
        endTime: {
          gt: new Date(start.getTime() - bufferMs),
          lte: start,
        },
      },
    });

    if (appointmentWithBufferConflict) {
      return NextResponse.json(
        {
          error: "BUFFER_CONFLICT",
          message: "This time slot falls within a buffer period.",
        },
        { status: 409 }
      );
    }

    const newBookingBufferEnd = new Date(end.getTime() + bufferMs);
    const nextAppointmentConflict = await prisma.appointment.findFirst({
      where: {
        professionalId,
        status: { in: ["upcoming", "pending"] },
        startTime: { gte: end, lt: newBookingBufferEnd },
      },
    });

    if (nextAppointmentConflict) {
      return NextResponse.json(
        {
          error: "BUFFER_CONFLICT",
          message:
            "This booking's buffer would overlap with the next appointment.",
        },
        { status: 409 }
      );
    }

    // Create appointment
    const newAppointment = await prisma.appointment.create({
      data: {
        userId,
        professionalId,
        startTime: start,
        endTime: end,
        status: "upcoming",
        venue: finalVenue,
        rate: finalVenue === "video" ? (professional.videoRate ?? professional.rate) : professional.rate,
      },
    });

    // Send email notifications (non-blocking)
    const professionalUser = professional.applications[0]?.user;
    if (client.email && professionalUser?.email) {
      const durationMs = end.getTime() - start.getTime();
      const durationHours = durationMs / (1000 * 60 * 60);
      const activeRate = finalVenue === "video" ? (professional.videoRate ?? professional.rate) : professional.rate;
      const amount = `$${((activeRate || 0) * durationHours).toFixed(2)}`;
      const duration = `${durationHours.toFixed(1)} hour${durationHours !== 1 ? "s" : ""}`;
      const venueLabel =
        finalVenue === "host" ? "Professional's Location" :
          finalVenue === "visit" ? "Client's Location" : "Video Session";

      const clientName =
        client.name ||
        `${client.firstName || ""} ${client.lastName || ""}`.trim() ||
        "Client";
      const professionalName = professional.name || "Professional";

      sendAppointmentBookedEmails(
        client.email,
        clientName,
        professionalUser.email,
        professionalName,
        format(start, "MMMM d, yyyy"),
        format(start, "h:mm a"),
        duration,
        amount,
        venueLabel
        // newAppointment.id
      ).catch((err) => console.error("Failed to send booking emails:", err));
    }

    return NextResponse.json({ appointment: newAppointment }, { status: 201 });
  } catch (error) {
    console.error("Booking POST error:", error);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}
