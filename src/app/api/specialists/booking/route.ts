import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const therapistId = searchParams.get("therapistId");
  const date = searchParams.get("date");

  if (!therapistId || !date) {
    return NextResponse.json(
      { error: "Missing therapistId or date" },
      { status: 400 }
    );
  }

  try {
    const therapist = await prisma.specialist.findUnique({
      where: { id: therapistId },
    });
    if (!therapist) {
      return NextResponse.json(
        { error: "Therapist not found" },
        { status: 404 }
      );
    }

    const appointments = await prisma.appointment.findMany({
      where: {
        specialistId: therapistId,
        date: {
          gte: new Date(new Date(date).setHours(0, 0, 0, 0)),
          lt: new Date(new Date(date).setHours(24, 0, 0, 0)),
        },
      },
      select: { time: true },
    });

    const slots = Array.from({ length: 13 }, (_, i) => `${i + 8}:00`).map(
      (time) => ({
        time,
        available: !appointments.some((appt) => appt.time === time),
      })
    );

    return NextResponse.json({ slots }, { status: 200 });
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

  const { therapistId, date, time, userId } = await request.json();

  if (!therapistId || !date || !time || !userId) {
    return NextResponse.json(
      { error: "Missing therapistId, date, time, or userId" },
      { status: 400 }
    );
  }

  if (session.user.id !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const therapist = await prisma.specialist.findUnique({
      where: { id: therapistId },
    });
    if (!therapist) {
      return NextResponse.json(
        { error: "Therapist not found" },
        { status: 404 }
      );
    }

    const existingAppointment = await prisma.appointment.findFirst({
      where: { specialistId: therapistId, date: new Date(date), time },
    });

    if (existingAppointment) {
      return NextResponse.json(
        { error: "Time slot unavailable" },
        { status: 409 }
      );
    }

    const appointment = await prisma.appointment.create({
      data: {
        userId,
        specialistId: therapistId,
        date: new Date(date),
        time,
        status: "upcoming",
      },
    });

    return NextResponse.json({ appointment }, { status: 201 });
  } catch (error) {
    console.error("Booking error:", error);
    return NextResponse.json(
      { error: "Failed to create booking" },
      { status: 500 }
    );
  }
}
