// src/app/api/proposals/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { broadcastToConversation } from "@/lib/websocket/server";
import { format } from "date-fns";
import {
  sendAppointmentBookedEmails,
  sendAppointmentRejectedEmail,
} from "@/lib/services/email";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { status: newStatus } = body as { status: "accepted" | "rejected" };

  if (!["accepted", "rejected"].includes(newStatus)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  try {
    // Get proposal with all related data
    const proposal = await prisma.proposal.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            name: true,
          },
        },
        professional: {
          select: {
            id: true,
            name: true,
            rate: true,
            venue: true,
            applications: {
              where: { status: "APPROVED" },
              select: {
                userId: true,
                user: {
                  select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    name: true,
                  },
                },
              },
              take: 1,
            },
          },
        },
        conversation: true,
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
        { error: "Proposal already processed" },
        { status: 400 }
      );
    }

    const professionalUser = proposal.professional.applications[0]?.user;
    const professionalUserId = proposal.professional.applications[0]?.userId;

    // Verify user has permission to update
    const isClient = session.user.id === proposal.userId;
    const isProfessional = session.user.id === professionalUserId;

    // Determine who can accept/reject based on initiator
    const canRespond =
      (proposal.initiator === "user" && isProfessional) ||
      (proposal.initiator === "professional" && isClient);

    if (!canRespond) {
      return NextResponse.json(
        { error: "You cannot respond to this proposal" },
        { status: 403 }
      );
    }

    // Update proposal status
    const updatedProposal = await prisma.proposal.update({
      where: { id },
      data: { status: newStatus },
    });

    // Prepare names for emails and messages
    const clientName =
      proposal.user.name ||
      `${proposal.user.firstName || ""} ${proposal.user.lastName || ""}`.trim() ||
      "Client";

    const professionalName = proposal.professional.name || "Professional";

    const startDate = proposal.startTime ? new Date(proposal.startTime) : null;
    const endDate = proposal.endTime ? new Date(proposal.endTime) : null;

    // Determine recipient for system message
    const systemMessageRecipientId =
      session.user.id === proposal.userId
        ? professionalUserId!
        : proposal.userId;

    if (newStatus === "accepted" && startDate && endDate) {
      // Create appointment
      const appointment = await prisma.appointment.create({
        data: {
          userId: proposal.userId,
          professionalId: proposal.professionalId,
          startTime: startDate,
          endTime: endDate,
          status: "upcoming",
          venue: proposal.venue,
          rate: proposal.professional.rate,
        },
      });

      // Calculate duration and amount for email
      const durationMs = endDate.getTime() - startDate.getTime();
      const durationHours = durationMs / (1000 * 60 * 60);
      const amount = `$${((proposal.professional.rate || 0) * durationHours).toFixed(2)}`;
      const duration = `${durationHours.toFixed(1)} hour${durationHours !== 1 ? "s" : ""}`;
      const venueLabel =
        proposal.venue === "host"
          ? "Professional's Location"
          : "Client's Location";

      // Create system message
      const systemMessage = await prisma.message.create({
        data: {
          conversationId: proposal.conversationId,
          senderId: session.user.id,
          recipientId: systemMessageRecipientId,
          text: `✅ Proposal accepted! Appointment confirmed for ${format(startDate, "MMMM d, yyyy")} at ${format(startDate, "h:mm a")}.`,
          isAudio: false,
          isSystem: true,
          proposalId: proposal.id,
        },
      });

      // Broadcast proposal status update via WebSocket
      broadcastToConversation(
        proposal.conversationId,
        {
          type: "proposalUpdate",
          conversationId: proposal.conversationId,
          proposalId: proposal.id,

          message: {
            id: systemMessage.id,
            text: systemMessage.text,
            createdAt: systemMessage.createdAt.toISOString(),
            senderId: systemMessage.senderId,
            isSystem: true,
          },
        },
        session.user.id
      ).catch((err) => console.error("WebSocket broadcast error:", err));

      // Send confirmation emails to both parties (non-blocking)
      if (proposal.user.email && professionalUser?.email) {
        sendAppointmentBookedEmails(
          proposal.user.email,
          clientName,
          professionalUser.email,
          professionalName,
          format(startDate, "MMMM d, yyyy"),
          format(startDate, "h:mm a"),
          duration,
          amount,
          venueLabel,
          appointment.id
        ).catch((err) =>
          console.error("Failed to send confirmation emails:", err)
        );
      }

      return NextResponse.json({
        success: true,
        proposal: updatedProposal,
        appointment,
      });
    } else if (newStatus === "rejected") {
      // Create system message
      const systemMessage = await prisma.message.create({
        data: {
          conversationId: proposal.conversationId,
          senderId: session.user.id,
          recipientId: systemMessageRecipientId,
          text: `❌ Proposal declined.`,
          isAudio: false,
          isSystem: true,
          proposalId: proposal.id,
        },
      });

      // Broadcast proposal status update via WebSocket
      broadcastToConversation(
        proposal.conversationId,
        {
          type: "proposalUpdate",
          conversationId: proposal.conversationId,
          proposalId: proposal.id,

          message: {
            id: systemMessage.id,
            text: systemMessage.text,
            createdAt: systemMessage.createdAt.toISOString(),
            senderId: systemMessage.senderId,
            isSystem: true,
          },
        },
        session.user.id
      ).catch((err) => console.error("WebSocket broadcast error:", err));

      // Send rejection email to the initiator (non-blocking)
      if (startDate && proposal.initiator === "user" && proposal.user.email) {
        sendAppointmentRejectedEmail(
          proposal.user.email,
          clientName,
          professionalName,
          format(startDate, "MMMM d, yyyy"),
          format(startDate, "h:mm a")
        ).catch((err) => console.error("Failed to send rejection email:", err));
      }

      return NextResponse.json({
        success: true,
        proposal: updatedProposal,
      });
    }

    return NextResponse.json({ success: true, proposal: updatedProposal });
  } catch (error) {
    console.error("Proposal update error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// GET single proposal
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const proposal = await prisma.proposal.findUnique({
      where: { id },
      include: {
        user: {
          select: { firstName: true, lastName: true, profileImage: true },
        },
        professional: {
          select: { name: true, rate: true, image: true },
        },
      },
    });

    if (!proposal) {
      return NextResponse.json(
        { error: "Proposal not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(proposal);
  } catch (error) {
    console.error("Get proposal error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
