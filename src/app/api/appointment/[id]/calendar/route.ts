// File: src/app/api/appointment/[id]/calendar/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import {
  createEvent,
  EventAttributes,
  EventStatus,
  ActionType,
  ParticipationStatus,
  ParticipationRole,
} from "ics";
import { Prisma } from "@prisma/client";

type AppointmentWithRelations = Prisma.AppointmentGetPayload<{
  include: {
    user: { select: { name: true; email: true } };
    professional: {
      select: {
        name: true;
        rate: true;
        application: {
          select: {
            user: { select: { location: true } };
          };
        };
      };
    };
  };
}>;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resolvedParams = await params;
  const bookingId = resolvedParams.id;

  if (!bookingId || bookingId === "undefined") {
    return NextResponse.json({ error: "Invalid booking ID" }, { status: 400 });
  }

  try {
    const appointment: AppointmentWithRelations | null =
      await prisma.appointment.findUnique({
        where: { id: bookingId },
        include: {
          user: { select: { name: true, email: true } },
          professional: {
            select: {
              name: true,
              rate: true,
              application: { select: { user: { select: { location: true } } } },
            },
          },
        },
      });

    if (!appointment) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (session.user.id !== appointment.userId && !session.user.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const appointmentStartDateTime: Date = appointment.startTime;
    const appointmentEndDateTime: Date = appointment.endTime;

    const formatICalDate = (
      date: Date
    ): [number, number, number, number, number] => [
      date.getUTCFullYear(),
      date.getUTCMonth() + 1,
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
    ];

    const event: EventAttributes = {
      start: formatICalDate(appointmentStartDateTime),
      end: formatICalDate(appointmentEndDateTime),
      title: `Appointment with ${appointment.professional?.name || "Professional"}`,
      description: `Appointment with ${appointment.professional?.name || "Professional"} for ${appointment.user?.name || "Client"}. Rate: $${appointment.professional?.rate?.toFixed(2) || "50.00"}`,
      location:
        appointment.professional?.application?.user?.location ||
        "Virtual Session",
      organizer: {
        name: appointment.professional?.name || "Professional",
        email: "no-reply@yourapp.com",
      },
      attendees: [
        {
          name: appointment.user?.name || "Client",
          email: appointment.user?.email || "client@example.com",
          rsvp: true,
          partstat: "ACCEPTED" as ParticipationStatus,
          role: "REQ-PARTICIPANT" as ParticipationRole,
        },
        {
          name: appointment.professional?.name || "Professional",
          email: "professional@example.com",
          rsvp: true,
          partstat: "ACCEPTED" as ParticipationStatus,
          role: "REQ-PARTICIPANT" as ParticipationRole,
        },
      ],
      status: "CONFIRMED" as EventStatus,
      alarms: [
        {
          action: "display" as ActionType,
          description: "Reminder: Upcoming appointment",
          trigger: { hours: 1, before: true },
        },
      ],
    };

    const { error, value } = createEvent(event);

    if (error) {
      return NextResponse.json(
        { error: "Failed to generate calendar event" },
        { status: 500 }
      );
    }

    if (!value) {
      return NextResponse.json(
        { error: "Generated calendar event is empty" },
        { status: 500 }
      );
    }

    return new NextResponse(value, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="appointment-${bookingId}.ics"`,
      },
    });
  } catch (error) {
    console.error("Calendar sync server error:", error);
    return NextResponse.json(
      { error: "Failed to process calendar request" },
      { status: 500 }
    );
  }
}
