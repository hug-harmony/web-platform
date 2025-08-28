import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

/*
export async function GET(request: Request) {
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

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  if (!date) {
    return NextResponse.json({ error: "Missing date" }, { status: 400 });
  }

  try {
    const availability = await prisma.availability.findUnique({
      where: { specialistId_date: { specialistId, date: new Date(date) } },
    });

    return NextResponse.json({ slots: availability?.slots || [] }, { status: 200 });
  } catch (error) {
    console.error("Availability fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch availability" }, { status: 500 });
  }
}
*/

/*
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const specialistId = searchParams.get("specialistId");

  if (!date) {
    return NextResponse.json({ error: "Missing date" }, { status: 400 });
  }

  let targetId: string;
  if (specialistId) {
    targetId = specialistId;
  } else {
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
    targetId = app.specialistId;
  }

  try {
    const availability = await prisma.availability.findUnique({
      where: {
        specialistId_date: { specialistId: targetId, date: new Date(date) },
      },
    });
    return NextResponse.json(
      { slots: availability?.slots || [] },
      { status: 200 }
    );
  } catch (error) {
    console.error("Availability fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch availability" },
      { status: 500 }
    );
  }
}
*/

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const specialistId = searchParams.get("specialistId");

  if (!date) {
    return NextResponse.json({ error: "Missing date" }, { status: 400 });
  }

  try {
    if (specialistId) {
      const availability = await prisma.availability.findUnique({
        where: { specialistId_date: { specialistId, date: new Date(date) } },
      });
      return NextResponse.json(
        { slots: availability?.slots || [] },
        { status: 200 }
      );
    } else {
      const availabilities = await prisma.availability.findMany({
        where: { date: new Date(date) },
        select: { specialistId: true, slots: true },
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

  const { date, slots } = await request.json();
  if (!date || !Array.isArray(slots)) {
    return NextResponse.json(
      { error: "Missing date or slots" },
      { status: 400 }
    );
  }

  try {
    await prisma.availability.upsert({
      where: { specialistId_date: { specialistId, date: new Date(date) } },
      update: { slots },
      create: { specialistId, date: new Date(date), slots },
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
