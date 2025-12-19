// app/api/proposals/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { broadcastToConversation } from "@/lib/websocket/server";
import { format } from "date-fns";

// GET - Fetch proposals for current user
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role") || "user";
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const status = searchParams.get("status");
  const userId = session.user.id;

  try {
    // Check if user is a professional
    const professionalApp = await prisma.professionalApplication.findUnique({
      where: { odI },
      select: { status: true, professionalId: true },
    });

    const isProfessional =
      professionalApp?.status === "APPROVED" && professionalApp?.professionalId;

    if (role === "professional" && !isProfessional) {
      return NextResponse.json(
        { error: "Forbidden: Not a professional" },
        { status: 403 }
      );
    }

    // Build date filter
    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    // Build where clause
    const whereClause: Record<string, unknown> =
      role === "professional"
        ? { professionalId: professionalApp!.professionalId! }
        : { odI };

    if (Object.keys(dateFilter).length > 0) {
      whereClause.startTime = { ...dateFilter, not: null };
    }

    if (status) {
      whereClause.status = status;
    }

    const proposals = await prisma.proposal.findMany({
      where: whereClause,
      include: {
        user: {
          select: { firstName: true, lastName: true, profileImage: true },
        },
        professional: {
          select: { name: true, rate: true, image: true },
        },
        conversation: {
          select: { id: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      proposals: proposals.map((p) => ({
        id: p.id,
        odI: p.userId,
        professionalId: p.professionalId,
        conversationId: p.conversationId,
        startTime: p.startTime,
        endTime: p.endTime,
        venue: p.venue,
        status: p.status,
        initiator: p.initiator,
        createdAt: p.createdAt,
        user: {
          name:
            `${p.user.firstName || ""} ${p.user.lastName || ""}`.trim() ||
            "User",
          profileImage: p.user.profileImage,
        },
        professional: {
          name: p.professional.name,
          rate: p.professional.rate || 0,
          image: p.professional.image,
        },
      })),
      isProfessional,
    });
  } catch (error) {
    console.error("Error fetching proposals:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST - Create a new proposal
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      conversationId,
      startTime: startTimeStr,
      endTime: endTimeStr,
      venue,
    } = body;

    // Parse and validate times
    const startTime = new Date(startTimeStr);
    const endTime = new Date(endTimeStr);

    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format" },
        { status: 400 }
      );
    }

    if (startTime >= endTime) {
      return NextResponse.json(
        { error: "End time must be after start time" },
        { status: 400 }
      );
    }

    if (startTime < new Date()) {
      return NextResponse.json(
        { error: "Cannot create proposal in the past" },
        { status: 400 }
      );
    }

    // Check if user is a professional
    const professionalApp = await prisma.professionalApplication.findFirst({
      where: { userId: session.user.id, status: "APPROVED" },
      select: { professionalId: true },
    });

    const isProfessional = !!professionalApp?.professionalId;

    let professionalId: string;
    let targetUserId: string;
    let recipientId: string;

    if (isProfessional) {
      // Professional-initiated proposal
      if (!conversationId || !body.userId) {
        return NextResponse.json(
          { error: "Missing conversationId or userId" },
          { status: 400 }
        );
      }
      professionalId = professionalApp!.professionalId!;
      targetUserId = body.userId;
      recipientId = body.userId;
    } else {
      // User-initiated request
      if (!conversationId || !body.professionalId) {
        return NextResponse.json(
          { error: "Missing conversationId or professionalId" },
          { status: 400 }
        );
      }
      professionalId = body.professionalId;
      targetUserId = session.user.id;

      // Get professional's user ID
      const profApp = await prisma.professionalApplication.findFirst({
        where: { professionalId, status: "APPROVED" },
        select: { odI: true },
      });

      if (!profApp?.userId) {
        return NextResponse.json(
          { error: "Professional not found" },
          { status: 404 }
        );
      }
      recipientId = profApp.userId;
    }

    // Verify conversation exists and user has access
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { userId1: true, userId2: true },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    const isConversationParticipant = [
      conversation.userId1,
      conversation.userId2,
    ].includes(session.user.id);

    if (!isConversationParticipant) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Get professional details for venue validation
    const professional = await prisma.professional.findUnique({
      where: { id: professionalId },
      select: { venue: true, rate: true, name: true },
    });

    if (!professional) {
      return NextResponse.json(
        { error: "Professional not found" },
        { status: 404 }
      );
    }

    // Determine venue
    let finalVenue: "host" | "visit" | undefined;
    if (professional.venue === "both") {
      if (!venue) {
        return NextResponse.json(
          { error: "Venue selection required" },
          { status: 400 }
        );
      }
      finalVenue = venue;
    } else {
      finalVenue = professional.venue as "host" | "visit";
    }

    // Check for overlapping appointments
    const overlapping = await prisma.appointment.findFirst({
      where: {
        professionalId,
        status: { in: ["upcoming", "pending", "break"] },
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    });

    if (overlapping) {
      return NextResponse.json(
        { error: "Time slot already booked" },
        { status: 409 }
      );
    }

    // Create proposal
    const proposal = await prisma.proposal.create({
      data: {
        professionalId,
        userId: targetUserId,
        conversationId,
        startTime,
        endTime,
        venue: finalVenue,
        status: "pending",
        initiator: isProfessional ? "professional" : "user",
      },
    });

    // Create message
    const messageText = isProfessional
      ? `📅 Session proposal: ${format(startTime, "MMMM d, yyyy")} from ${format(startTime, "h:mm a")} to ${format(endTime, "h:mm a")}. Venue: ${finalVenue}. Please accept or reject.`
      : `📅 Appointment request: ${format(startTime, "MMMM d, yyyy")} from ${format(startTime, "h:mm a")} to ${format(endTime, "h:mm a")}. Venue: ${finalVenue}. Please accept or decline.`;

    const message = await prisma.message.create({
      data: {
        conversationId,
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
      },
    });

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
      proposalId: proposal.id,
      proposalStatus: "pending",
      initiator: isProfessional ? "professional" : "user",
      sender: {
        name:
          `${message.senderUser?.firstName ?? ""} ${message.senderUser?.lastName ?? ""}`.trim() ||
          "Unknown User",
        profileImage: message.senderUser?.profileImage ?? null,
        isProfessional,
        odI: professionalApp?.professionalId ?? null,
      },
    };

    // Broadcast via WebSocket
    broadcastToConversation(
      conversationId,
      {
        type: "newMessage",
        conversationId,
        message: formattedMessage,
      },
      session.user.id
    ).catch((err) => console.error("WebSocket broadcast error:", err));

    return NextResponse.json(proposal, { status: 201 });
  } catch (error) {
    console.error("Error creating proposal:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
