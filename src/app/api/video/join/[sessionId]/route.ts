// src/app/api/video/join/[sessionId]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { addAttendeeToMeeting, getMeeting } from "@/lib/services/chime";

interface ChimeError extends Error {
  name: string;
}

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

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Get video session
    const videoSession = await prisma.videoSession.findUnique({
      where: { id: sessionId },
      include: {
        attendees: true,
        professional: {
          select: {
            id: true,
            name: true,
            applications: {
              where: { status: "APPROVED" },
              select: { userId: true },
              take: 1,
            },
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
    });

    if (!videoSession) {
      return NextResponse.json(
        { error: "Video session not found" },
        { status: 404 }
      );
    }

    // Check if session is joinable
    if (
      ["COMPLETED", "CANCELLED", "FAILED", "NO_SHOW"].includes(
        videoSession.status
      )
    ) {
      return NextResponse.json(
        { error: "Video session is no longer active" },
        { status: 400 }
      );
    }

    // Verify user is authorized to join
    const professionalUserId =
      videoSession.professional?.applications?.[0]?.userId;
    const isClient = session.user.id === videoSession.userId;
    const isProfessional = session.user.id === professionalUserId;

    if (!isClient && !isProfessional) {
      return NextResponse.json(
        { error: "Not authorized to join this session" },
        { status: 403 }
      );
    }

    // Check if user already has an attendee record with valid token
    let attendee = videoSession.attendees.find(
      (a) => a.externalUserId === session.user.id
    );

    // Get user display name
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, firstName: true, lastName: true },
    });

    const displayName =
      user?.name ||
      `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
      "Participant";

    // Verify meeting still exists in Chime
    const chimeMeeting = await getMeeting(videoSession.meetingId);

    if (!chimeMeeting) {
      // Meeting expired, update status
      await prisma.videoSession.update({
        where: { id: sessionId },
        data: { status: "FAILED", endReason: "meeting_expired" },
      });
      return NextResponse.json(
        { error: "Meeting has expired. Please start a new call." },
        { status: 410 }
      );
    }

    if (!attendee) {
      // Create new attendee in Chime
      try {
        const chimeAttendee = await addAttendeeToMeeting(
          videoSession.meetingId,
          session.user.id
          // displayName
        );

        // Save attendee record
        attendee = await prisma.videoAttendee.create({
          data: {
            videoSessionId: sessionId,
            attendeeId: chimeAttendee.AttendeeId!,
            externalUserId: session.user.id,
            joinToken: chimeAttendee.JoinToken!,
            role: isProfessional ? "host" : "participant",
            displayName,
          },
        });
      } catch (chimeError: unknown) {
        console.error("Failed to create Chime attendee:", chimeError);

        // If meeting doesn't exist, mark session as failed
        const error = chimeError as ChimeError;
        if (error.name === "NotFoundException") {
          await prisma.videoSession.update({
            where: { id: sessionId },
            data: { status: "FAILED", endReason: "meeting_not_found" },
          });
          return NextResponse.json(
            { error: "Meeting no longer exists. Please start a new call." },
            { status: 410 }
          );
        }

        throw chimeError;
      }
    }

    // Update attendee join time
    await prisma.videoAttendee.update({
      where: { id: attendee.id },
      data: { joinedAt: new Date() },
    });

    // Update session status
    const activeAttendees = videoSession.attendees.filter(
      (a) => a.joinedAt && !a.leftAt
    );

    const newStatus = activeAttendees.length === 0 ? "WAITING" : "IN_PROGRESS";

    await prisma.videoSession.update({
      where: { id: sessionId },
      data: {
        status: newStatus,
        actualStart: videoSession.actualStart || new Date(),
      },
    });

    return NextResponse.json({
      meeting: {
        MeetingId: videoSession.meetingId,
        MediaPlacement: videoSession.mediaPlacement,
        MediaRegion: videoSession.mediaRegion,
      },
      attendee: {
        AttendeeId: attendee.attendeeId,
        ExternalUserId: attendee.externalUserId,
        JoinToken: attendee.joinToken,
      },
    });
  } catch (error) {
    console.error("Join video session error:", error);
    return NextResponse.json(
      { error: "Failed to join video session" },
      { status: 500 }
    );
  }
}
