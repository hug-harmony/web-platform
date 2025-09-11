// app/api/specialists/booking/route.ts
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
        status: { in: ["upcoming", "pending"] },
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

  const { specialistId, date, time, userId } = await request.json();

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
        status: { in: ["upcoming", "pending"] },
      },
    });

    if (existingAppointment) {
      return NextResponse.json(
        { error: "SLOT_ALREADY_BOOKED", message: "Time slot already booked" },
        { status: 409 }
      );
    }

    const appointment = await prisma.appointment.create({
      data: {
        userId,
        specialistId,
        date: utcDate,
        time,
        status: "upcoming",
      },
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
