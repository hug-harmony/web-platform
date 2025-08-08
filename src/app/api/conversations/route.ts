/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { userId1: session.user.id },
          { userId2: session.user.id },
          { specialistId1: session.user.id },
          { specialistId2: session.user.id },
        ],
      },
      include: {
        user1: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
        user2: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
        specialist1: {
          select: { id: true, name: true, image: true },
        },
        specialist2: {
          select: { id: true, name: true, image: true },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { text: true, createdAt: true },
        },
      },
    });

    const formattedConversations = conversations.map((conv) => ({
      id: conv.id,
      user1: conv.user1,
      user2: conv.user2,
      specialist1: conv.specialist1,
      specialist2: conv.specialist2,
      lastMessage: conv.messages[0],
      messageCount: conv.messages.length,
    }));

    return NextResponse.json(formattedConversations);
  } catch (error) {
    console.error("Fetch conversations error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { recipientId, isSpecialistRecipient } = await request.json();
    if (!recipientId || !/^[0-9a-fA-F]{24}$/.test(recipientId)) {
      return NextResponse.json(
        { error: "Invalid recipient ID" },
        { status: 400 }
      );
    }

    if (recipientId === session.user.id) {
      return NextResponse.json(
        { error: "Cannot create conversation with self" },
        { status: 400 }
      );
    }

    // Check if session user is a specialist
    const isSessionUserSpecialist = await prisma.specialist.findUnique({
      where: { id: session.user.id },
    });

    // Check if recipient is a specialist
    const isRecipientSpecialist = isSpecialistRecipient
      ? await prisma.specialist.findUnique({ where: { id: recipientId } })
      : await prisma.user.findUnique({ where: { id: recipientId } });

    if (!isRecipientSpecialist && isSpecialistRecipient) {
      return NextResponse.json(
        { error: "Specialist not found" },
        { status: 404 }
      );
    }
    if (!isRecipientSpecialist && !isSpecialistRecipient) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if conversation already exists
    const existingConversation = await prisma.conversation.findFirst({
      where: {
        OR: [
          { userId1: session.user.id, userId2: recipientId },
          { userId1: recipientId, userId2: session.user.id },
          { userId1: session.user.id, specialistId2: recipientId },
          { specialistId1: session.user.id, userId2: recipientId },
          { specialistId1: session.user.id, specialistId2: recipientId },
          { specialistId1: recipientId, specialistId2: session.user.id },
          { userId1: recipientId, specialistId2: session.user.id },
          { specialistId1: recipientId, userId2: session.user.id },
        ],
      },
      include: {
        user1: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
        user2: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
        specialist1: { select: { id: true, name: true, image: true } },
        specialist2: { select: { id: true, name: true, image: true } },
      },
    });

    if (existingConversation) {
      return NextResponse.json(existingConversation);
    }

    // Create new conversation based on participant types
    const conversationData: any = {};
    if (isSessionUserSpecialist) {
      conversationData.specialistId1 = session.user.id;
      if (isSpecialistRecipient) {
        conversationData.specialistId2 = recipientId;
      } else {
        conversationData.userId2 = recipientId;
      }
    } else {
      conversationData.userId1 = session.user.id;
      if (isSpecialistRecipient) {
        conversationData.specialistId2 = recipientId;
      } else {
        conversationData.userId2 = recipientId;
      }
    }

    const conversation = await prisma.conversation.create({
      data: conversationData,
      include: {
        user1: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
        user2: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
        specialist1: { select: { id: true, name: true, image: true } },
        specialist2: { select: { id: true, name: true, image: true } },
      },
    });

    return NextResponse.json(conversation);
  } catch (error) {
    console.error("Create conversation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
