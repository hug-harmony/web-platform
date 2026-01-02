// app/api/conversations/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { ProOnboardingStatus } from "@prisma/client";

// GET - Fetch all conversations for the current user
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    // Check if admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true },
    });

    const whereClause = user?.isAdmin
      ? {}
      : { OR: [{ userId1: userId }, { userId2: userId }] };

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
            biography: true,
            location: true,
            createdAt: true,
            emailVerified: true,
            professionalApplication: {
              select: {
                status: true,
                professionalId: true,
                professional: {
                  select: {
                    id: true,
                    rating: true,
                    reviewCount: true,
                    image: true,
                    biography: true,
                    location: true,
                  },
                },
              },
            },
          },
        },
        user2: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
            lastOnline: true,
            biography: true,
            location: true,
            createdAt: true,
            emailVerified: true,
            professionalApplication: {
              select: {
                status: true,
                professionalId: true,
                professional: {
                  select: {
                    id: true,
                    rating: true,
                    reviewCount: true,
                    image: true,
                    biography: true,
                    location: true,
                  },
                },
              },
            },
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
            isAudio: true,
            imageUrl: true,
          },
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Calculate unread counts using transaction for efficiency
    const unreadCounts = await prisma.$transaction(
      conversations.map((conv) => {
        const readBy = (conv.readBy as Record<string, string> | null) || {};
        const lastRead = readBy[userId]
          ? new Date(readBy[userId])
          : new Date(0);

        return prisma.message.count({
          where: {
            conversationId: conv.id,
            senderId: { not: userId },
            createdAt: { gt: lastRead },
          },
        });
      })
    );

    // Type for user with professional application
    type UserWithProfessional = (typeof conversations)[0]["user1"];

    // Helper to format user with professional info
    const formatUser = (user: UserWithProfessional) => {
      // professionalApplication is a one-to-one relation, not an array
      const professionalApp = user.professionalApplication;
      const isApproved =
        professionalApp?.status === ProOnboardingStatus.APPROVED;
      const professional = isApproved ? professionalApp?.professional : null;

      return {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImage: user.profileImage || professional?.image || null,
        lastOnline: user.lastOnline,
        biography: user.biography || professional?.biography || null,
        location: user.location || professional?.location || null,
        createdAt: user.createdAt,
        isVerified: user.emailVerified,
        isProfessional: !!professional,
        professionalId: professional?.id || null,
        rating: professional?.rating || null,
        reviewCount: professional?.reviewCount || null,
      };
    };

    // Format response with enriched user data
    const formattedConversations = conversations.map((conv, index) => {
      // Determine message type
      const lastMessage = conv.messages[0];
      let messageType: "text" | "image" | "audio" = "text";
      if (lastMessage?.isAudio) messageType = "audio";
      else if (lastMessage?.imageUrl) messageType = "image";

      return {
        id: conv.id,
        userId1: conv.userId1,
        userId2: conv.userId2,
        user1: formatUser(conv.user1),
        user2: formatUser(conv.user2),
        lastMessage: lastMessage
          ? {
              id: lastMessage.id,
              text: lastMessage.text,
              createdAt: lastMessage.createdAt.toISOString(),
              senderId: lastMessage.senderId,
              type: messageType,
            }
          : null,
        messageCount: conv._count.messages,
        unreadCount: unreadCounts[index],
        updatedAt: conv.updatedAt.toISOString(),
        isPinned: false,
        isArchived: false,
      };
    });

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

    // User select fields for includes
    const userSelect = {
      id: true,
      firstName: true,
      lastName: true,
      profileImage: true,
      lastOnline: true,
      biography: true,
      location: true,
      createdAt: true,
      emailVerified: true,
      professionalApplication: {
        select: {
          status: true,
          professionalId: true,
          professional: {
            select: {
              id: true,
              rating: true,
              reviewCount: true,
              image: true,
              biography: true,
              location: true,
            },
          },
        },
      },
    };

    // Check for existing conversation
    const existingConversation = await prisma.conversation.findFirst({
      where: {
        OR: [
          { userId1: session.user.id, userId2: recipientId },
          { userId1: recipientId, userId2: session.user.id },
        ],
      },
      include: {
        user1: { select: userSelect },
        user2: { select: userSelect },
      },
    });

    // Type for user with professional application
    type UserWithProfessional = NonNullable<
      typeof existingConversation
    >["user1"];

    // Helper to format user with professional info
    const formatUser = (user: UserWithProfessional) => {
      // professionalApplication is a one-to-one relation, not an array
      const professionalApp = user.professionalApplication;
      const isApproved =
        professionalApp?.status === ProOnboardingStatus.APPROVED;
      const professional = isApproved ? professionalApp?.professional : null;

      return {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImage: user.profileImage || professional?.image || null,
        lastOnline: user.lastOnline,
        biography: user.biography || professional?.biography || null,
        location: user.location || professional?.location || null,
        createdAt: user.createdAt,
        isVerified: user.emailVerified,
        isProfessional: !!professional,
        professionalId: professional?.id || null,
        rating: professional?.rating || null,
        reviewCount: professional?.reviewCount || null,
      };
    };

    if (existingConversation) {
      return NextResponse.json({
        id: existingConversation.id,
        userId1: existingConversation.userId1,
        userId2: existingConversation.userId2,
        user1: formatUser(existingConversation.user1),
        user2: formatUser(existingConversation.user2),
        updatedAt: existingConversation.updatedAt.toISOString(),
      });
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
        user1: { select: userSelect },
        user2: { select: userSelect },
      },
    });

    return NextResponse.json(
      {
        id: conversation.id,
        userId1: conversation.userId1,
        userId2: conversation.userId2,
        user1: formatUser(conversation.user1),
        user2: formatUser(conversation.user2),
        updatedAt: conversation.updatedAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create conversation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
