// app/api/professionals/availability/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { allSlots } from "@/lib/constants";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const professionalId = searchParams.get("professionalId");
  const dayOfWeek = searchParams.get("dayOfWeek");

  if (!professionalId || dayOfWeek === null) {
    return NextResponse.json(
      { error: "Missing professionalId or dayOfWeek" },
      { status: 400 }
    );
  }

  const day = Number(dayOfWeek);
  if (isNaN(day) || day < 0 || day > 6) {
    return NextResponse.json(
      { error: "Invalid dayOfWeek (0-6)" },
      { status: 400 }
    );
  }

  try {
    const avail = await prisma.availability.findUnique({
      where: { professionalId_dayOfWeek: { professionalId, dayOfWeek: day } },
    });

    return NextResponse.json(
      {
        slots: avail?.slots ?? [],
        breakDuration: avail?.breakDuration ?? 30,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error(err);
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

  const app = await prisma.professionalApplication.findUnique({
    where: { userId: session.user.id },
    select: {
      status: true,
      professionalId: true,
    },
  });
  if (!app || app.status !== "APPROVED" || !app.professionalId) {
    return NextResponse.json(
      { error: "Forbidden: Not an approved professional" },
      { status: 403 }
    );
  }
  const professionalId = app.professionalId;

  const { dayOfWeek, slots, breakDuration } = await request.json();

  if (
    dayOfWeek === undefined ||
    !Array.isArray(slots) ||
    ![30, 60].includes(breakDuration)
  ) {
    return NextResponse.json(
      { error: "Missing/invalid: dayOfWeek, slots, breakDuration" },
      { status: 400 }
    );
  }

  const day = Number(dayOfWeek);
  if (isNaN(day) || day < 0 || day > 6) {
    return NextResponse.json(
      { error: "dayOfWeek must be 0-6" },
      { status: 400 }
    );
  }

  const invalid = slots.filter((s: string) => !allSlots.includes(s));
  if (invalid.length) {
    return NextResponse.json(
      { error: `Invalid slots: ${invalid.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    // Try update first
    const existing = await prisma.availability.findFirst({
      where: { professionalId, dayOfWeek: day },
    });

    if (existing) {
      await prisma.availability.update({
        where: { id: existing.id },
        data: { slots, breakDuration },
      });
    } else {
      await prisma.availability.create({
        data: { professionalId, dayOfWeek: day, slots, breakDuration },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to save availability" },
      { status: 500 }
    );
  }
}
