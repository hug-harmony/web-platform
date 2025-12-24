// File: src/app/api/appointment/calendar/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { createEvent, EventAttributes } from "ics";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const appointments = await prisma.appointment.findMany({
      where: { userId: session.user.id, startTime: { gte: new Date() } },
      include: {
        user: { select: { name: true, email: true } },
        professional: {
          select: {
            name: true,
            rate: true,
            applications: { select: { user: { select: { location: true } } } },
          },
        },
      },
    });

    const icsEvents: string[] = [];

    // Proper tuple formatter (fixes TS error)
    const formatICalDate = (
      date: Date
    ): [number, number, number, number, number] => [
      date.getUTCFullYear(),
      date.getUTCMonth() + 1,
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
    ];

    for (const appt of appointments) {
      const start = formatICalDate(appt.startTime);
      const end = formatICalDate(appt.endTime);

      const event: EventAttributes = {
        start,
        end,
        title: `Appointment with ${appt.professional?.name || "Professional"}`,
        description: `Appointment with ${
          appt.professional?.name || "Professional"
        } for ${appt.user?.name || "Client"}. Rate: $${appt.professional?.rate || 50}`,
        location:
          appt.professional?.applications?.[0]?.user?.location ||
          "Virtual Session",
      };

      const { value, error } = createEvent(event);
      if (!error && value) icsEvents.push(value);
    }

    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      ...icsEvents,
      "END:VCALENDAR",
    ].join("\r\n");

    return new NextResponse(ics, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="all-appointments.ics"`,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to generate calendar" },
      { status: 500 }
    );
  }
}
