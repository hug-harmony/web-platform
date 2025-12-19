// app/api/messages/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { broadcastToConversation } from "@/lib/websocket/server";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { conversationId, text, recipientId, imageUrl } = body;

  // Validation
  if (!conversationId || (!text && !imageUrl) || !recipientId) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  if (
    !/^[0-9a-fA-F]{24}$/.test(conversationId) ||
    !/^[0-9a-fA-F]{24}$/.test(recipientId)
  ) {
    return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
  }

  try {
    // Verify conversation access
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

    const isParticipant = [conversation.userId1, conversation.userId2].includes(
      session.user.id
    );
    if (!isParticipant) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Create message with sender info
    const message = await prisma.message.create({
      data: {
        text: text || "",
        senderId: session.user.id,
        recipientId,
        conversationId,
        imageUrl,
        isAudio: false,
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

    // Update conversation timestamp
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    // Get professional application info (it's a single object, not array)
    const profApp = message.senderUser?.professionalApplication;
    const isProfessional = !!profApp?.professionalId;
    const professionalId = profApp?.professionalId ?? null;

    // Format message for response and broadcast
    const formattedMessage = {
      id: message.id,
      text: message.text,
      imageUrl: message.imageUrl,
      createdAt: message.createdAt.toISOString(),
      senderId: message.senderId,
      userId: message.recipientId,
      isAudio: message.isAudio,
      isSystem: false,
      proposalId: null,
      proposalStatus: null,
      initiator: null,
      sender: {
        name:
          `${message.senderUser?.firstName ?? ""} ${message.senderUser?.lastName ?? ""}`.trim() ||
          "Unknown User",
        profileImage: message.senderUser?.profileImage ?? null,
        isProfessional,
        userId: professionalId,
      },
    };

    // Broadcast via WebSocket (non-blocking)
    broadcastToConversation(
      conversationId,
      {
        type: "newMessage",
        conversationId,
        message: formattedMessage,
      },
      session.user.id // Exclude sender
    ).catch((err) => {
      console.error("WebSocket broadcast error:", err);
    });

    return NextResponse.json(formattedMessage, { status: 201 });
  } catch (error) {
    console.error("Send message error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
