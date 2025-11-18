import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { createEvent, EventAttributes } from "ics";

export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ userId: string }> }
) {
  // Await the params promise to get the parameters
  const params = await props.params;
  const { userId } = params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!userId) {
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
  }

  if (session.user.id !== userId && !session.user.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const appointments = await prisma.appointment.findMany({
      where: { userId, startTime: { gte: new Date() } },
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

    const icsEvents: string[] = [];

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
      const event: EventAttributes = {
        start: formatICalDate(appt.startTime),
        end: formatICalDate(appt.endTime),
        title: `Appointment with ${appt.professional?.name || "Professional"}`,
        description: `Appointment with ${
          appt.professional?.name || "Professional"
        } for ${appt.user?.name || "Client"}. Rate: $${appt.professional?.rate || 50}`,
        location:
          appt.professional?.application?.user?.location || "Virtual Session",
      };

      const { value, error } = createEvent(event);
      if (!error && value) {
        // Remove VCALENDAR wrapper for bulk ICS
        const cleaned = value
          .replace(/^BEGIN:VCALENDAR\r?\n/, "")
          .replace(/END:VCALENDAR\r?\n?$/, "");
        icsEvents.push(cleaned);
      }
    }

    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "CALSCALE:GREGORIAN",
      ...icsEvents,
      "END:VCALENDAR",
    ].join("\r\n");

    return new NextResponse(ics, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `inline; filename="appointments-${userId}.ics"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Calendar feed error:", error);
    return NextResponse.json(
      { error: "Failed to generate calendar feed" },
      { status: 500 }
    );
  }
}
