import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { formatInTimeZone } from "date-fns-tz";
import { parse } from "date-fns";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const specialistId = searchParams.get("specialistId");
  const date = searchParams.get("date");

  if (!specialistId || !date) {
    return NextResponse.json(
      { error: "Missing specialistId or date" },
      { status: 400 }
    );
  }

  const requestedDate = new Date(date);
  requestedDate.setUTCHours(0, 0, 0, 0); // Normalize to UTC
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  if (requestedDate < today) {
    return NextResponse.json(
      { error: "Cannot fetch availability for past dates" },
      { status: 400 }
    );
  }

  try {
    const specialist = await prisma.specialist.findUnique({
      where: { id: specialistId },
    });
    if (!specialist) {
      return NextResponse.json(
        { error: "Specialist not found" },
        { status: 404 }
      );
    }

    const availability = await prisma.availability.findUnique({
      where: {
        specialistId_date: { specialistId, date: requestedDate },
      },
    });

    const appointments = await prisma.appointment.findMany({
      where: {
        specialistId,
        date: requestedDate,
        status: { in: ["upcoming", "pending", "break"] }, // Include breaks as reserved
      },
      select: { time: true },
    });

    const bookedTimes = appointments.map((appt) => appt.time);
    const slots = (availability?.slots || []).map((time: string) => {
      // Parse time string (e.g., "12:00 AM") to create a valid Date object
      const parsedTime = parse(time, "h:mm a", new Date());
      if (isNaN(parsedTime.getTime())) {
        throw new Error(`Invalid time format: ${time}`);
      }
      return {
        time,
        formattedTime: formatInTimeZone(parsedTime, "UTC", "h:mm a"),
        available: !bookedTimes.includes(time),
      };
    });

    return NextResponse.json(
      { slots, breakDuration: availability?.breakDuration || null },
      { status: 200 }
    );
  } catch (error) {
    console.error("Availability error:", error);
    return NextResponse.json(
      { error: "Failed to fetch availability" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { specialistId, date, time, userId } = body as {
    specialistId?: string;
    date?: string;
    time?: string;
    userId?: string;
  };
  // Optional venue from client
  const reqVenue = (body?.venue as "host" | "visit" | undefined) ?? undefined;

  if (!specialistId || !date || !time || !userId) {
    return NextResponse.json(
      { error: "Missing specialistId, date, time, or userId" },
      { status: 400 }
    );
  }

  if (session.user.id !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const utcDate = new Date(date);
  utcDate.setUTCHours(0, 0, 0, 0);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  if (utcDate < today) {
    return NextResponse.json(
      { error: "Cannot book appointments for past dates" },
      { status: 400 }
    );
  }

  try {
    const specialist = await prisma.specialist.findUnique({
      where: { id: specialistId },
    });
    if (!specialist) {
      return NextResponse.json(
        { error: "Specialist not found" },
        { status: 404 }
      );
    }

    // Determine venue for this booking
    let venueChoice: "host" | "visit" | undefined = reqVenue;
    if (!venueChoice) {
      if (specialist.venue === "host" || specialist.venue === "visit") {
        venueChoice = specialist.venue as "host" | "visit";
      } else {
        // specialist.venue === 'both' and no explicit venue provided
        return NextResponse.json(
          {
            error: "VENUE_REQUIRED",
            message:
              "Venue is required because the specialist supports both host and visit",
          },
          { status: 400 }
        );
      }
    }

    const availability = await prisma.availability.findUnique({
      where: {
        specialistId_date: { specialistId, date: utcDate },
      },
    });

    if (!availability || !availability.slots.includes(time)) {
      return NextResponse.json(
        { error: "SLOT_NOT_AVAILABLE", message: "Time slot not available" },
        { status: 409 }
      );
    }

    // Real-time validation: check if slot is still available
    const existingAppointment = await prisma.appointment.findFirst({
      where: {
        specialistId,
        date: utcDate,
        time,
        status: { in: ["upcoming", "pending", "break"] },
      },
    });

    if (existingAppointment) {
      return NextResponse.json(
        { error: "SLOT_ALREADY_BOOKED", message: "Time slot already booked" },
        { status: 409 }
      );
    }

    // Helper: Convert time string to minutes since midnight
    const timeToMinutes = (time: string): number => {
      const parsed = parse(time, "h:mm a", new Date());
      return parsed.getHours() * 60 + parsed.getMinutes();
    };

    const appointment = await prisma.$transaction(async (tx) => {
      // Create main appointment (venue required by schema)
      const newAppointment = await tx.appointment.create({
        data: {
          userId,
          specialistId,
          date: utcDate,
          time,
          status: "upcoming",
          venue: venueChoice!, // guaranteed by logic above
        },
      });

      // Reserve breaks if availability exists
      if (
        availability &&
        availability.slots.length > 0 &&
        availability.breakDuration
      ) {
        const breakDuration = availability.breakDuration;
        // Sort slots by time for safety
        const sortedSlots = [...availability.slots].sort(
          (a, b) => timeToMinutes(a) - timeToMinutes(b)
        );
        const selectedMinutes = timeToMinutes(time);
        const slotIndex = sortedSlots.findIndex(
          (slot) => timeToMinutes(slot) === selectedMinutes
        );
        if (slotIndex === -1) throw new Error("Selected slot not found");

        // Assume 30-min slots; adjust if different
        const slotDuration = 30;
        const numReserve = Math.ceil(breakDuration / slotDuration); // e.g., 1 for 30min, 2 for 60min

        // Function to create break if not exists
        const createBreakIfAvailable = async (breakTime: string) => {
          const existing = await tx.appointment.findFirst({
            where: {
              specialistId,
              date: utcDate,
              time: breakTime,
              status: { in: ["upcoming", "pending", "break"] },
            },
          });
          if (!existing && availability.slots.includes(breakTime)) {
            // Only if in slots and not booked
            await tx.appointment.create({
              data: {
                userId: null, // Null for breaks
                specialistId,
                date: utcDate,
                time: breakTime,
                status: "break",
                rate: 0, // No charge for breaks
                venue: newAppointment.venue, // must include venue for schema
              },
            });
          } // Skip if already reserved or not in availability.slots
        };

        // Reserve previous slots (up to numReserve before, if exist)
        for (let i = 1; i <= numReserve; i++) {
          const prevIndex = slotIndex - i;
          if (prevIndex >= 0) {
            const prevTime = sortedSlots[prevIndex];
            await createBreakIfAvailable(prevTime);
          }
        }

        // Reserve next slots (up to numReserve after, if exist)
        for (let i = 1; i <= numReserve; i++) {
          const nextIndex = slotIndex + i;
          if (nextIndex < sortedSlots.length) {
            const nextTime = sortedSlots[nextIndex];
            await createBreakIfAvailable(nextTime);
          }
        }
      }

      return newAppointment;
    });

    return NextResponse.json({ appointment }, { status: 201 });
  } catch (error) {
    console.error("Booking error:", error);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR", message: "Failed to create booking" },
      { status: 500 }
    );
  }
}
