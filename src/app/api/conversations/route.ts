// app/api/conversations/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

// GET - Fetch all conversations for the current user
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    // Check if admin
    const user = await prisma.user.findUnique({
      where: { id: odI },
      select: { isAdmin: true },
    });

    const whereClause = user?.isAdmin
      ? {}
      : { OR: [{ userId1: odI }, { userId2: odI }] };

    // Single optimized query with all needed data
    const conversations = await prisma.conversation.findMany({
      where: whereClause,
      include: {
        user1: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
            lastOnline: true,
          },
        },
        user2: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
            lastOnline: true,
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            text: true,
            createdAt: true,
            senderId: true,
          },
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Calculate unread counts
    const conversationIds = conversations.map((c) => c.id);

    // Batch query for unread messages
    const unreadCounts = await prisma.$transaction(
      conversations.map((conv) => {
        const readBy = (conv.readBy as Record<string, string> | null) || {};
        const lastRead = readBy[userId]
          ? new Date(readBy[userId])
          : new Date(0);

        return prisma.message.count({
          where: {
            conversationId: conv.id,
            senderId: { not: odI },
            createdAt: { gt: lastRead },
          },
        });
      })
    );

    // Format response
    const formattedConversations = conversations.map((conv, index) => ({
      id: conv.id,
      user1: conv.user1,
      user2: conv.user2,
      lastMessage: conv.messages[0] || null,
      messageCount: conv._count.messages,
      unreadCount: unreadCounts[index],
      updatedAt: conv.updatedAt,
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

// POST - Create a new conversation
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { recipientId } = body;

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

    // Check if recipient exists
    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
      select: { id: true },
    });

    if (!recipient) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check for existing conversation
    const existingConversation = await prisma.conversation.findFirst({
      where: {
        OR: [
          { userId1: session.user.id, userId2: recipientId },
          { userId1: recipientId, userId2: session.user.id },
        ],
      },
      include: {
        user1: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
            lastOnline: true,
          },
        },
        user2: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
            lastOnline: true,
          },
        },
      },
    });

    if (existingConversation) {
      return NextResponse.json(existingConversation);
    }

    // Create new conversation
    const conversation = await prisma.conversation.create({
      data: {
        userId1: session.user.id,
        userId2: recipientId,
        readBy: {
          [session.user.id]: new Date().toISOString(),
        },
      },
      include: {
        user1: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
            lastOnline: true,
          },
        },
        user2: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
            lastOnline: true,
          },
        },
      },
    });

    return NextResponse.json(conversation, { status: 201 });
  } catch (error) {
    console.error("Create conversation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
