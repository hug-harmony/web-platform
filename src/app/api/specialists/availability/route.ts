// app/api/specialists/availability/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { allSlots } from "@/lib/constants";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const specialistId = searchParams.get("specialistId");

  if (!date) {
    return NextResponse.json({ error: "Missing date" }, { status: 400 });
  }

  try {
    const utcDate = new Date(date);
    utcDate.setUTCHours(0, 0, 0, 0); // Normalize to UTC midnight

    if (specialistId) {
      const availability = await prisma.availability.findUnique({
        where: { specialistId_date: { specialistId, date: utcDate } },
      });
      return NextResponse.json(
        {
          slots: availability?.slots || [],
          breakDuration: availability?.breakDuration || 30,
        },
        { status: 200 }
      );
    } else {
      const availabilities = await prisma.availability.findMany({
        where: { date: utcDate },
        select: { specialistId: true, slots: true, breakDuration: true },
      });
      return NextResponse.json({ availabilities }, { status: 200 });
    }
  } catch (error) {
    console.error("Availability fetch error:", error);
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

  const app = await prisma.specialistApplication.findUnique({
    where: { userId: session.user.id },
  });
  if (!app || app.status !== "approved" || !app.specialistId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const specialistId = app.specialistId;

  const { date, slots, breakDuration } = await request.json();
  if (
    !date ||
    !Array.isArray(slots) ||
    slots.length === 0 ||
    ![30, 60].includes(breakDuration)
  ) {
    return NextResponse.json(
      { error: "Missing or invalid date, slots, or break duration" },
      { status: 400 }
    );
  }

  const utcDate = new Date(date);
  utcDate.setUTCHours(0, 0, 0, 0); // Normalize to UTC midnight

  // Validate slots
  const invalidSlots = slots.filter((slot: string) => !allSlots.includes(slot));
  if (invalidSlots.length > 0) {
    return NextResponse.json(
      { error: `Invalid slots: ${invalidSlots.join(", ")}` },
      { status: 400 }
    );
  }

  // Validate break duration between slots
  const timeToMinutes = (time: string) => {
    const [hourStr, period] = time.split(" ");
    const [hour, minute] = hourStr.split(":").map(Number);
    return ((hour % 12) + (period === "PM" ? 12 : 0)) * 60 + minute;
  };
  for (let i = 0; i < slots.length - 1; i++) {
    const current = timeToMinutes(slots[i]);
    const next = timeToMinutes(slots[i + 1]);
    if (next - current < breakDuration && next - current !== 0) {
      return NextResponse.json(
        {
          error: `Slots must have at least ${breakDuration} minutes between them`,
        },
        { status: 400 }
      );
    }
  }

  try {
    await prisma.availability.upsert({
      where: { specialistId_date: { specialistId, date: utcDate } },
      update: { slots, breakDuration },
      create: { specialistId, date: utcDate, slots, breakDuration },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Availability update error:", error);
    return NextResponse.json(
      { error: "Failed to update availability" },
      { status: 500 }
    );
  }
}
