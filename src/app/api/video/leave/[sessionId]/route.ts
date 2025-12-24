// src/app/api/video/leave/[sessionId]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

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

    // Update attendee leave time
    await prisma.videoAttendee.updateMany({
      where: {
        videoSessionId: sessionId,
        externalUserId: session.user.id,
        leftAt: null,
      },
      data: { leftAt: new Date() },
    });

    // Check if all attendees have left
    const remainingAttendees = await prisma.videoAttendee.count({
      where: {
        videoSessionId: sessionId,
        joinedAt: { not: null },
        leftAt: null,
      },
    });

    // If no one is left, update status to WAITING
    if (remainingAttendees === 0) {
      await prisma.videoSession.update({
        where: { id: sessionId },
        data: { status: "WAITING" },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Leave video session error:", error);
    return NextResponse.json(
      { error: "Failed to leave video session" },
      { status: 500 }
    );
  }
}
