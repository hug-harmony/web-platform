import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if admin
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true },
    });

    if (!currentUser?.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const professionalId = searchParams.get("professionalId");

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    const videoSessions = await prisma.videoSession.findMany({
      where: {
        userId,
        ...(professionalId ? { professionalId } : {}),
      },
      select: {
        id: true,
        meetingId: true,
        userId: true,
        professionalId: true,
        scheduledStart: true,
        actualStart: true,
        actualEnd: true,
        status: true,
        createdAt: true,
        professional: {
          select: {
            id: true,
            name: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { scheduledStart: "desc" },
    });

    // Format for admin display
    const formatted = videoSessions.map((session) => ({
      _id: session.id,
      id: session.id,
      meetingId: session.meetingId,
      userId: session.userId,
      professionalId: session.professionalId,
      professionalName: session.professional?.name || "Unknown Professional",
      userName: session.user?.name || "Unknown User",
      scheduledStart: session.scheduledStart?.toISOString() || null,
      actualStart: session.actualStart?.toISOString() || null,
      actualEnd: session.actualEnd?.toISOString() || null,
      startTimeFormatted: session.scheduledStart
        ? session.scheduledStart.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "Not scheduled",
      status: session.status,
      createdAt: session.createdAt.toISOString(),
    }));

    return NextResponse.json(formatted);
  } catch (err: unknown) {
    console.error("Error fetching video sessions:", err);
    return NextResponse.json(
      { error: "Failed to fetch video sessions" },
      { status: 500 }
    );
  }
}
