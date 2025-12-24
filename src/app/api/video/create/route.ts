// src/app/api/video/create/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  createChimeMeeting,
  getOptimalMediaRegion,
} from "@/lib/services/chime";
import { randomUUID } from "crypto";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { professionalId, appointmentId, scheduledStart } = body;

    if (!professionalId) {
      return NextResponse.json(
        { error: "Professional ID is required" },
        { status: 400 }
      );
    }

    // Verify professional exists and get their user ID
    const professional = await prisma.professional.findUnique({
      where: { id: professionalId },
      select: {
        id: true,
        name: true,
        applications: {
          where: { status: "APPROVED" },
          select: { userId: true },
          take: 1,
        },
      },
    });

    if (!professional) {
      return NextResponse.json(
        { error: "Professional not found" },
        { status: 404 }
      );
    }

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, firstName: true, lastName: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if there's already an active session for this appointment (only if appointmentId is provided)
    if (appointmentId) {
      const existingSession = await prisma.videoSession.findFirst({
        where: {
          appointmentId,
          status: { in: ["SCHEDULED", "WAITING", "IN_PROGRESS"] },
        },
      });

      if (existingSession) {
        // Return existing session instead of creating a new one
        return NextResponse.json({
          videoSession: {
            id: existingSession.id,
            meetingId: existingSession.meetingId,
            externalMeetingId: existingSession.externalMeetingId,
          },
          message: "Existing session found",
        });
      }
    }

    // For instant calls (no appointment), check if there's already an active session between these users
    if (!appointmentId) {
      const existingInstantSession = await prisma.videoSession.findFirst({
        where: {
          userId: session.user.id,
          professionalId,
          appointmentId: null, // Only check instant calls
          status: { in: ["SCHEDULED", "WAITING", "IN_PROGRESS"] },
          // Only consider sessions created in the last hour as "active"
          createdAt: {
            gte: new Date(Date.now() - 60 * 60 * 1000),
          },
        },
      });

      if (existingInstantSession) {
        // Return existing session
        return NextResponse.json({
          videoSession: {
            id: existingInstantSession.id,
            meetingId: existingInstantSession.meetingId,
            externalMeetingId: existingInstantSession.externalMeetingId,
          },
          message: "Existing session found",
        });
      }
    }

    // Generate unique meeting ID
    const externalMeetingId = `hh_${randomUUID()}`;
    const displayName =
      user.name ||
      `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
      "Participant";

    // Determine media region
    const mediaRegion = getOptimalMediaRegion();

    // Create Chime meeting
    const { meeting, attendee } = await createChimeMeeting(
      externalMeetingId,
      session.user.id,
      displayName,
      mediaRegion
    );

    // Build the data object conditionally
    const videoSessionData: {
      meetingId: string;
      externalMeetingId: string;
      mediaRegion: string;
      mediaPlacement: object | null;
      userId: string;
      professionalId: string;
      scheduledStart: Date | null;
      status:
        | "SCHEDULED"
        | "WAITING"
        | "IN_PROGRESS"
        | "COMPLETED"
        | "CANCELLED"
        | "NO_SHOW"
        | "FAILED";
      appointmentId?: string;
    } = {
      meetingId: meeting.MeetingId!,
      externalMeetingId,
      mediaRegion,
      mediaPlacement: meeting.MediaPlacement as object | null,
      userId: session.user.id,
      professionalId,
      scheduledStart: scheduledStart ? new Date(scheduledStart) : null,
      status: "SCHEDULED",
    };

    // Only add appointmentId if it's provided (not null/undefined)
    if (appointmentId) {
      videoSessionData.appointmentId = appointmentId;
    }

    // Save to database
    const videoSession = await prisma.videoSession.create({
      data: videoSessionData,
    });

    // Create attendee record
    await prisma.videoAttendee.create({
      data: {
        videoSessionId: videoSession.id,
        attendeeId: attendee.AttendeeId!,
        externalUserId: session.user.id,
        joinToken: attendee.JoinToken!,
        role: "participant",
        displayName,
      },
    });

    return NextResponse.json({
      videoSession: {
        id: videoSession.id,
        meetingId: videoSession.meetingId,
        externalMeetingId: videoSession.externalMeetingId,
      },
      meeting: {
        MeetingId: meeting.MeetingId,
        MediaPlacement: meeting.MediaPlacement,
        MediaRegion: meeting.MediaRegion,
      },
      attendee: {
        AttendeeId: attendee.AttendeeId,
        ExternalUserId: attendee.ExternalUserId,
        JoinToken: attendee.JoinToken,
      },
    });
  } catch (error) {
    console.error("Create video session error:", error);
    return NextResponse.json(
      { error: "Failed to create video session" },
      { status: 500 }
    );
  }
}
