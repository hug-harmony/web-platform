// src/app/api/video/end/[sessionId]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { endChimeMeeting } from "@/lib/services/chime";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sessionId } = await params;
    const body = await request.json().catch(() => ({}));
    const { reason = "completed" } = body;

    // Get video session
    const videoSession = await prisma.videoSession.findUnique({
      where: { id: sessionId },
      include: {
        professional: {
          select: {
            applications: {
              where: { status: "APPROVED" },
              select: { userId: true },
              take: 1,
            },
          },
        },
      },
    });

    if (!videoSession) {
      return NextResponse.json(
        { error: "Video session not found" },
        { status: 404 }
      );
    }

    // Verify user is authorized
    const professionalUserId =
      videoSession.professional?.applications?.[0]?.userId;
    const isAuthorized =
      session.user.id === videoSession.userId ||
      session.user.id === professionalUserId ||
      session.user.isAdmin;

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Not authorized to end this session" },
        { status: 403 }
      );
    }

    // Calculate duration
    const now = new Date();
    const duration = videoSession.actualStart
      ? Math.floor((now.getTime() - videoSession.actualStart.getTime()) / 1000)
      : 0;

    // End meeting in Chime
    await endChimeMeeting(videoSession.meetingId);

    // Update session
    await prisma.videoSession.update({
      where: { id: sessionId },
      data: {
        status: "COMPLETED",
        actualEnd: now,
        duration,
        endReason: reason,
      },
    });

    // Update all attendees with leave time
    await prisma.videoAttendee.updateMany({
      where: {
        videoSessionId: sessionId,
        leftAt: null,
      },
      data: { leftAt: now },
    });

    return NextResponse.json({ success: true, duration });
  } catch (error) {
    console.error("End video session error:", error);
    return NextResponse.json(
      { error: "Failed to end video session" },
      { status: 500 }
    );
  }
}
