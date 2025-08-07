import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const therapistId = searchParams.get("therapistId");
  const date = searchParams.get("date");

  if (!therapistId || !date) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  try {
    // Verify therapist exists
    const therapist = await prisma.specialist.findUnique({
      where: { id: therapistId },
    });

    if (!therapist) {
      return NextResponse.json(
        { error: "Therapist not found" },
        { status: 404 }
      );
    }

    // Get booked appointments for the given date
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

    // Define standard time slots (e.g., 9 AM to 5 PM, hourly)
    const standardSlots = [
      "09:00 AM",
      "10:00 AM",
      "11:00 AM",
      "12:00 PM",
      "01:00 PM",
      "02:00 PM",
      "03:00 PM",
      "04:00 PM",
    ];

    // Mark slots as unavailable if booked
    const slots = standardSlots.map((time) => ({
      time,
      available: !appointments.some((appt) => appt.time === time),
    }));

    return NextResponse.json({ slots }, { status: 200 });
  } catch (error) {
    console.error("Availability error:", error);
    return NextResponse.json(
      { error: "Failed to fetch availability" },
      { status: 500 }
    );
  }
}
