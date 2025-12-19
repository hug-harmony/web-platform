// app/api/proposals/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { broadcastToConversation } from "@/lib/websocket/server";
import { format } from "date-fns";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const statusSchema = z.object({
  status: z.enum(["accepted", "rejected"]),
  venue: z.enum(["host", "visit"]).optional(),
});

// PATCH - Update proposal status (accept/reject)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
    return NextResponse.json({ error: "Invalid proposal ID" }, { status: 400 });
  }

  let body;
  try {
    body = statusSchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { status: action, venue } = body;

  try {
    // Fetch proposal with all needed relations
    const proposal = await prisma.proposal.findUnique({
      where: { id },
      include: {
        conversation: { select: { id: true, userId1: true, userId2: true } },
        user: {
          select: { firstName: true, lastName: true, profileImage: true },
        },
        professional: {
          select: { name: true, rate: true, venue: true, image: true },
        },
      },
    });

    if (!proposal) {
      return NextResponse.json(
        { error: "Proposal not found" },
        { status: 404 }
      );
    }

    if (proposal.status !== "pending") {
      return NextResponse.json(
        { error: `Proposal already ${proposal.status}` },
        { status: 409 }
      );
    }

    // Get professional's user ID for authorization check
    const professionalApp = await prisma.professionalApplication.findFirst({
      where: { professionalId: proposal.professionalId, status: "APPROVED" },
      select: { userId: true },
    });

    if (!professionalApp?.userId) {
      return NextResponse.json(
        { error: "Professional not found" },
        { status: 404 }
      );
    }

    // Determine who can respond based on initiator
    // If professional initiated, user responds. If user initiated, professional responds.
    const isUserResponder = proposal.initiator === "professional";
    const canUpdate = isUserResponder
      ? proposal.userId === session.user.id
      : professionalApp.userId === session.user.id;

    if (!canUpdate) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Update proposal status
    const updatedProposal = await prisma.proposal.update({
      where: { id },
      data: { status: action },
    });

    // Determine recipient for the response message
    // The recipient is the original sender (initiator)
    const recipientId = isUserResponder
      ? professionalApp.userId // Professional initiated, so notify professional
      : proposal.userId; // User initiated, so notify user

    let appointmentId: string | undefined;
    let messageText: string;

    if (action === "accepted") {
      // Validate required time fields
      if (!proposal.startTime || !proposal.endTime) {
        return NextResponse.json(
          { error: "Proposal missing time information" },
          { status: 400 }
        );
      }

      // Determine venue choice
      let venueChoice: "host" | "visit" | undefined = proposal.venue || venue;

      if (!venueChoice) {
        if (proposal.professional.venue === "both") {
          return NextResponse.json(
            { error: "Venue selection required" },
            { status: 400 }
          );
        }
        venueChoice = proposal.professional.venue as "host" | "visit";
      }

      // Check for overlapping appointments one more time
      const overlapping = await prisma.appointment.findFirst({
        where: {
          professionalId: proposal.professionalId,
          status: { in: ["upcoming", "pending"] },
          startTime: { lt: proposal.endTime },
          endTime: { gt: proposal.startTime },
        },
      });

      if (overlapping) {
        // Revert proposal status
        await prisma.proposal.update({
          where: { id },
          data: { status: "pending" },
        });
        return NextResponse.json(
          { error: "Time slot no longer available" },
          { status: 409 }
        );
      }

      // Create appointment
      const appointment = await prisma.appointment.create({
        data: {
          userId: proposal.userId,
          professionalId: proposal.professionalId,
          startTime: proposal.startTime,
          endTime: proposal.endTime,
          status: "pending", // Pending payment
          venue: venueChoice,
          rate: proposal.professional.rate,
        },
      });
      appointmentId = appointment.id;

      // Format acceptance message based on who initiated
      const timeStr = `${format(proposal.startTime, "MMMM d, yyyy")} from ${format(proposal.startTime, "h:mm a")} to ${format(proposal.endTime, "h:mm a")}`;

      if (isUserResponder) {
        // User accepted professional's proposal
        messageText = `✅ Proposal accepted for ${timeStr}. Venue: ${venueChoice}. Please proceed to payment to confirm your appointment.`;
      } else {
        // Professional accepted user's request
        messageText = `✅ Appointment request accepted for ${timeStr}. Venue: ${venueChoice}. The session is now confirmed.`;
      }
    } else {
      // Rejection
      const timeStr = proposal.startTime
        ? `${format(proposal.startTime, "MMMM d, yyyy")} at ${format(proposal.startTime, "h:mm a")}`
        : "the requested time";

      if (isUserResponder) {
        // User rejected professional's proposal
        messageText = `❌ Proposal for ${timeStr} has been declined.`;
      } else {
        // Professional rejected user's request
        messageText = `❌ Appointment request for ${timeStr} has been declined.`;
      }
    }

    // Create response message
    const message = await prisma.message.create({
      data: {
        conversationId: proposal.conversationId,
        senderId: session.user.id,
        recipientId,
        text: messageText,
        isAudio: false,
        proposalId: proposal.id,
      },
      include: {
        senderUser: {
          select: {
            firstName: true,
            lastName: true,
            profileImage: true,
            professionalApplication: {
              select: { professionalId: true },
            },
          },
        },
        proposal: {
          select: { status: true, initiator: true },
        },
      },
    });

    // Update conversation timestamp
    await prisma.conversation.update({
      where: { id: proposal.conversationId },
      data: { updatedAt: new Date() },
    });

    // Get sender's professional application info (single object, not array)
    const senderProfApp = message.senderUser?.professionalApplication;

    // Format message for broadcast
    const formattedMessage = {
      id: message.id,
      text: message.text,
      imageUrl: null,
      createdAt: message.createdAt.toISOString(),
      senderId: message.senderId,
      userId: message.recipientId,
      isAudio: false,
      isSystem: false,
      proposalId: message.proposalId,
      proposalStatus: message.proposal?.status ?? null,
      initiator: message.proposal?.initiator ?? null,
      sender: {
        name:
          `${message.senderUser?.firstName ?? ""} ${message.senderUser?.lastName ?? ""}`.trim() ||
          "Unknown User",
        profileImage: message.senderUser?.profileImage ?? null,
        isProfessional: !!senderProfApp?.professionalId,
        userId: senderProfApp?.professionalId ?? null,
      },
    };

    // Broadcast via WebSocket
    broadcastToConversation(
      proposal.conversationId,
      {
        type: "newMessage",
        conversationId: proposal.conversationId,
        message: formattedMessage,
      },
      session.user.id
    ).catch((err) => {
      console.error("WebSocket broadcast error:", err);
    });

    // Also broadcast proposal update event
    broadcastToConversation(
      proposal.conversationId,
      {
        type: "proposalUpdate",
        conversationId: proposal.conversationId,
        proposalId: proposal.id,
        message: {
          status: action,
          appointmentId,
        },
      },
      undefined // Send to all participants including sender
    ).catch((err) => {
      console.error("WebSocket proposal update broadcast error:", err);
    });

    return NextResponse.json({
      success: true,
      proposal: {
        id: updatedProposal.id,
        status: updatedProposal.status,
        startTime: updatedProposal.startTime,
        endTime: updatedProposal.endTime,
        initiator: updatedProposal.initiator,
        professionalId: updatedProposal.professionalId,
      },
      appointmentId,
      message: formattedMessage,
    });
  } catch (error) {
    console.error("Update proposal status error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// GET - Fetch a single proposal by ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
    return NextResponse.json({ error: "Invalid proposal ID" }, { status: 400 });
  }

  try {
    const proposal = await prisma.proposal.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
        professional: {
          select: {
            id: true,
            name: true,
            rate: true,
            image: true,
            venue: true,
          },
        },
        conversation: {
          select: { id: true, userId1: true, userId2: true },
        },
      },
    });

    if (!proposal) {
      return NextResponse.json(
        { error: "Proposal not found" },
        { status: 404 }
      );
    }

    // Check authorization - user must be participant in conversation
    const isParticipant = [
      proposal.conversation.userId1,
      proposal.conversation.userId2,
    ].includes(session.user.id);

    if (!isParticipant) {
      // Check if admin
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { isAdmin: true },
      });

      if (!user?.isAdmin) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    }

    return NextResponse.json({
      id: proposal.id,
      userId: proposal.userId,
      professionalId: proposal.professionalId,
      conversationId: proposal.conversationId,
      startTime: proposal.startTime,
      endTime: proposal.endTime,
      venue: proposal.venue,
      status: proposal.status,
      initiator: proposal.initiator,
      createdAt: proposal.createdAt,
      user: {
        id: proposal.user.id,
        name:
          `${proposal.user.firstName || ""} ${proposal.user.lastName || ""}`.trim() ||
          "User",
        profileImage: proposal.user.profileImage,
      },
      professional: {
        id: proposal.professional.id,
        name: proposal.professional.name,
        rate: proposal.professional.rate,
        image: proposal.professional.image,
        venue: proposal.professional.venue,
      },
    });
  } catch (error) {
    console.error("Fetch proposal error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
