import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { createEvent, EventStatus, ActionType } from "ics";
import { addMinutes, isValid, parse } from "date-fns";
import { Prisma } from "@prisma/client";

type AppointmentWithRelations = Prisma.AppointmentGetPayload<{
  include: {
    user: { select: { name: true; email: true } };
    specialist: {
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

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    console.error("Unauthorized access attempt: No session or user ID");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bookingId = new URL(request.url).pathname.split("/").pop();
  if (!bookingId || bookingId === "undefined") {
    console.error("Invalid booking ID:", bookingId);
    return NextResponse.json({ error: "Invalid booking ID" }, { status: 400 });
  }

  try {
    const appointment: AppointmentWithRelations | null =
      await prisma.appointment.findUnique({
        where: { id: bookingId },
        include: {
          user: { select: { name: true, email: true } },
          specialist: {
            select: {
              name: true,
              rate: true,
              application: {
                select: {
                  user: { select: { location: true } },
                },
              },
            },
          },
        },
      });

    if (!appointment) {
      console.error(`Appointment not found for ID: ${bookingId}`);
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (session.user.id !== appointment.userId && !session.user.isAdmin) {
      console.error(
        `Forbidden access: User ${session.user.id} is not owner of appointment ${bookingId} or admin`
      );
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const dateStr = appointment.date.toISOString().split("T")[0];
    const timeStr = appointment.time;
    let appointmentDateTime: Date;

    try {
      appointmentDateTime = parse(
        `${dateStr} ${timeStr}`,
        "yyyy-MM-dd h:mm a",
        new Date()
      );
      if (!isValid(appointmentDateTime)) {
        throw new Error(`Invalid date/time format: ${dateStr} ${timeStr}`);
      }
    } catch (parseError) {
      console.error("Date parsing error:", parseError);
      return NextResponse.json(
        { error: "Invalid appointment date or time format" },
        { status: 400 }
      );
    }

    const duration = 60;
    const endDateTime = addMinutes(appointmentDateTime, duration);

    const formatICalDate = (
      date: Date
    ): [number, number, number, number, number] => [
      date.getUTCFullYear(),
      date.getUTCMonth() + 1,
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
    ];

    const event = {
      start: formatICalDate(appointmentDateTime),
      end: formatICalDate(endDateTime),
      title: `Appointment with ${appointment.specialist?.name || "Specialist"}`,
      description: `Appointment with ${appointment.specialist?.name || "Specialist"} for ${
        appointment.user?.name || "Client"
      }. Rate: $${appointment.specialist?.rate?.toFixed(2) || "50.00"}`,
      location:
        appointment.specialist?.application?.user?.location || "Virtual",
      organizer: {
        name: appointment.specialist?.name || "Specialist",
        email: "no-reply@yourapp.com",
      },
      attendee: [
        {
          name: appointment.user?.name || "Client",
          email: appointment.user?.email || "client@yourapp.com",
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

    const { error, value } = await new Promise<{
      error: unknown;
      value: string;
    }>((resolve) => {
      createEvent(event, (err, val) => {
        resolve({ error: err, value: val });
      });
    });

    if (error) {
      console.error(
        "Error generating iCalendar for appointment:",
        bookingId,
        error
      );
      return NextResponse.json(
        { error: "Failed to generate calendar event" },
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
    console.error(
      "Calendar sync error for appointment:",
      bookingId,
      error instanceof Error ? error.message : error,
      error instanceof Error ? error.stack : ""
    );
    return NextResponse.json(
      { error: "Failed to fetch booking details" },
      { status: 500 }
    );
  }
}
