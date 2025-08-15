/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const specialistId = searchParams.get("specialistId");

  if (!userId)
    return NextResponse.json({ error: "User ID required" }, { status: 400 });

  try {
    const videoSessions = await prisma.videoSession.findMany({
      where: {
        userId,
        ...(specialistId ? { specialistId } : {}),
      },
      include: { specialist: { select: { name: true, id: true } } },
    });

    return NextResponse.json(videoSessions);
  } catch (err: any) {
    console.error("Error fetching video sessions:", err);
    return NextResponse.json(
      { error: "Failed to fetch video sessions" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { userId, specialistId, date, time } = body;
  console.log("POST /api/videoSessions payload:", {
    userId,
    specialistId,
    date,
    time,
  });

  if (!userId || !specialistId)
    return NextResponse.json(
      { error: "User ID and Specialist ID required" },
      { status: 400 }
    );

  try {
    // Verify specialist exists
    const specialist = await prisma.specialist.findUnique({
      where: { id: specialistId },
      select: { id: true, name: true },
    });

    if (!specialist) {
      console.error(`Specialist not found for ID: ${specialistId}`);
      return NextResponse.json(
        { error: "Specialist not found" },
        { status: 404 }
      );
    }

    const videoSession = await prisma.videoSession.create({
      data: {
        roomId: `room_${Math.random().toString(36).substring(2)}`,
        userId,
        specialistId,
        date: new Date(date || Date.now()),
        time: time || new Date().toLocaleTimeString(),
        status: "upcoming",
      },
      include: { specialist: { select: { name: true, id: true } } },
    });

    return NextResponse.json(videoSession);
  } catch (err: any) {
    console.error("Error creating video session:", err);
    return NextResponse.json(
      { error: "Failed to create video session" },
      { status: 500 }
    );
  }
}
