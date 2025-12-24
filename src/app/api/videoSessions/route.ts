// src/app/api/videoSessions/route.ts
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
  const professionalId = searchParams.get("professionalId");

  if (!userId)
    return NextResponse.json({ error: "User ID required" }, { status: 400 });

  try {
    const videoSessions = await prisma.videoSession.findMany({
      where: {
        userId,
        ...(professionalId ? { professionalId } : {}),
      },
      include: { professional: { select: { name: true, id: true } } },
    });

    return NextResponse.json(videoSessions);
  } catch (err: unknown) {
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
  const { userId, professionalId, date, time } = body;
  console.log("POST /api/videoSessions payload:", {
    userId,
    professionalId,
    date,
    time,
  });

  if (!userId || !professionalId)
    return NextResponse.json(
      { error: "User ID and Professional ID required" },
      { status: 400 }
    );

  try {
    // Verify professional exists
    const professional = await prisma.professional.findUnique({
      where: { id: professionalId },
      select: { id: true, name: true },
    });

    if (!professional) {
      console.error(`Professional not found for ID: ${professionalId}`);
      return NextResponse.json(
        { error: "Professional not found" },
        { status: 404 }
      );
    }

    // Generate a unique meeting ID for the new session
    const meetingId = `meeting_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const videoSession = await prisma.videoSession.create({
      data: {
        meetingId,
        externalMeetingId: `room_${Math.random().toString(36).substring(2)}`,
        userId,
        professionalId,
        scheduledStart: date ? new Date(date) : new Date(),
        status: "SCHEDULED",
      },
      include: { professional: { select: { name: true, id: true } } },
    });

    return NextResponse.json(videoSession);
  } catch (err: unknown) {
    console.error("Error creating video session:", err);
    return NextResponse.json(
      { error: "Failed to create video session" },
      { status: 500 }
    );
  }
}
