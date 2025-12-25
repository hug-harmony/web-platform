// src/app/api/messages/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

async function getMessageAndValidate(messageId: string, userId: string) {
  if (!/^[0-9a-fA-F]{24}$/.test(messageId)) {
    return { error: "Invalid message ID", status: 400 };
  }

  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: {
      conversation: {
        select: { userId1: true, userId2: true },
      },
    },
  });

  if (!message) {
    return { error: "Message not found", status: 404 };
  }

  const isParticipant =
    message.conversation.userId1 === userId ||
    message.conversation.userId2 === userId;

  if (!isParticipant) {
    return { error: "Unauthorized", status: 403 };
  }

  if (message.senderId !== userId) {
    return { error: "You can only modify your own messages", status: 403 };
  }

  if (message.deletedAt) {
    return { error: "Cannot modify deleted message", status: 400 };
  }

  return { message };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
    return NextResponse.json(
      { error: "Invalid conversation ID" },
      { status: 400 }
    );
  }

  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true },
    });

    const isUserParticipant =
      conversation.userId1 === session.user.id ||
      conversation.userId2 === session.user.id;
    if (!isUserParticipant && !user?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Fetch messages with sender info
    const messages = await prisma.message.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: "asc" },
      include: {
        senderUser: { select: { firstName: true, lastName: true } },
        proposal: { select: { status: true, initiator: true } },
      },
    });

    const formattedMessages = await Promise.all(
      messages.map(async (msg) => {
        // Fetch sender details
        const senderUser = await prisma.user.findUnique({
          where: { id: msg.senderId },
          select: {
            firstName: true,
            lastName: true,
            profileImage: true,
            professionalApplication: {
              select: { professionalId: true },
            },
          },
        });

        return {
          id: msg.id,
          text: msg.text,
          imageUrl: msg.imageUrl,
          createdAt: msg.createdAt.toISOString(),
          deletedAt: msg.deletedAt?.toISOString() || null,
          senderId: msg.senderId,
          userId: msg.recipientId,
          isAudio: msg.isAudio,
          proposalId: msg.proposalId,
          proposalStatus: msg.proposal?.status || null,
          initiator: msg.proposal?.initiator || null,
          sender: {
            name:
              `${senderUser?.firstName || ""} ${senderUser?.lastName || ""}`.trim() ||
              "Unknown User",
            profileImage: senderUser?.profileImage || null,
            isProfessional: !!senderUser?.professionalApplication,
            userId: senderUser?.professionalApplication?.professionalId || null,
          },
        };
      })
    );

    return NextResponse.json(formattedMessages);
  } catch (error) {
    console.error("Fetch messages error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: messageId } = await params;
  const { text } = await request.json();

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json({ error: "Text is required" }, { status: 400 });
  }

  const validation = await getMessageAndValidate(messageId, session.user.id);
  if ("error" in validation) {
    return NextResponse.json(
      { error: validation.error },
      { status: validation.status }
    );
  }

  const { message } = validation;

  const createdAt = new Date(message.createdAt);
  const now = new Date();
  const diffMinutes = (now.getTime() - createdAt.getTime()) / 60000;

  if (diffMinutes > 10) {
    return NextResponse.json(
      { error: "Edit window expired (10 minutes)" },
      { status: 400 }
    );
  }

  const updatedMessage = await prisma.message.update({
    where: { id: messageId },
    data: { text: text.trim() },
    include: {
      senderUser: {
        select: {
          firstName: true,
          lastName: true,
          profileImage: true,
          professionalApplication: { select: { professionalId: true } },
        },
      },
    },
  });

  const senderName =
    `${updatedMessage.senderUser?.firstName ?? ""} ${updatedMessage.senderUser?.lastName ?? ""}`.trim() ||
    "Someone";

  const formatted = {
    id: updatedMessage.id,
    text: updatedMessage.text,
    imageUrl: updatedMessage.imageUrl,
    createdAt: updatedMessage.createdAt.toISOString(),
    deletedAt: updatedMessage.deletedAt?.toISOString() || null,
    senderId: updatedMessage.senderId,
    userId: updatedMessage.recipientId,
    isAudio: updatedMessage.isAudio,
    isSystem: updatedMessage.isSystem,
    proposalId: updatedMessage.proposalId,
    sender: {
      name: senderName,
      profileImage: updatedMessage.senderUser?.profileImage ?? null,
      isProfessional:
        !!updatedMessage.senderUser?.professionalApplication?.professionalId,
      userId:
        updatedMessage.senderUser?.professionalApplication?.professionalId ??
        null,
    },
    edited: true,
  };

  return NextResponse.json(formatted);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: messageId } = await params;

  const validation = await getMessageAndValidate(messageId, session.user.id);
  if ("error" in validation) {
    return NextResponse.json(
      { error: validation.error },
      { status: validation.status }
    );
  }

  const { message } = validation;

  const createdAt = new Date(message.createdAt);
  const now = new Date();
  const diffMinutes = (now.getTime() - createdAt.getTime()) / 60000;

  if (diffMinutes > 5) {
    return NextResponse.json(
      { error: "Undo window expired (5 minutes)" },
      { status: 400 }
    );
  }

  const deletedMessage = await prisma.message.update({
    where: { id: messageId },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({
    success: true,
    deletedMessageId: deletedMessage.id,
  });
}
