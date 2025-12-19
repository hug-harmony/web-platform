// app/api/conversations/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Fetch conversation details (optionally with messages)
export async function GET(request: NextRequest, { params }: RouteParams) {
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

  const { searchParams } = new URL(request.url);
  const includeMessages = searchParams.get("messages") === "true";
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const before = searchParams.get("before"); // For pagination

  try {
    // Build messages query if needed
    const messagesQuery = includeMessages
      ? {
          messages: {
            where: before ? { createdAt: { lt: new Date(before) } } : undefined,
            orderBy: { createdAt: "desc" as const },
            take: limit,
            select: {
              id: true,
              text: true,
              imageUrl: true,
              createdAt: true,
              senderId: true,
              recipientId: true,
              isAudio: true,
              isSystem: true,
              proposalId: true,
              proposal: {
                select: { status: true, initiator: true },
              },
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
          },
        }
      : {};

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        user1: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
            lastOnline: true,
            professionalApplication: {
              where: { status: "APPROVED" },
              select: { professionalId: true },
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
            professionalApplication: {
              where: { status: "APPROVED" },
              select: { professionalId: true },
            },
          },
        },
        ...messagesQuery,
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Access check
    const isParticipant = [conversation.userId1, conversation.userId2].includes(
      session.user.id
    );
    if (!isParticipant) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { isAdmin: true },
      });
      if (!user?.isAdmin) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    }

    // Determine professionalId
    const professionalId =
      conversation.user1.professionalApplication?.[0]?.professionalId ||
      conversation.user2.professionalApplication?.[0]?.professionalId ||
      null;

    // Format response
    const response: Record<string, unknown> = {
      id: conversation.id,
      user1: {
        id: conversation.user1.id,
        firstName: conversation.user1.firstName,
        lastName: conversation.user1.lastName,
        profileImage: conversation.user1.profileImage,
        lastOnline: conversation.user1.lastOnline,
        isProfessional: !!conversation.user1.professionalApplication?.[0],
      },
      user2: {
        id: conversation.user2.id,
        firstName: conversation.user2.firstName,
        lastName: conversation.user2.lastName,
        profileImage: conversation.user2.profileImage,
        lastOnline: conversation.user2.lastOnline,
        isProfessional: !!conversation.user2.professionalApplication?.[0],
      },
      professionalId,
      userId1: conversation.userId1,
      userId2: conversation.userId2,
    };

    // Format messages if included
    if (includeMessages && "messages" in conversation) {
      const messages = conversation.messages as Array<{
        id: string;
        text: string;
        imageUrl: string | null;
        createdAt: Date;
        senderId: string;
        recipientId: string;
        isAudio: boolean;
        isSystem: boolean;
        proposalId: string | null;
        proposal: { status: string; initiator: string } | null;
        senderUser: {
          firstName: string | null;
          lastName: string | null;
          profileImage: string | null;
          professionalApplication: Array<{
            professionalId: string | null;
          }> | null;
        } | null;
      }>;

      response.messages = messages
        .map((msg) => ({
          id: msg.id,
          text: msg.text,
          imageUrl: msg.imageUrl,
          createdAt: msg.createdAt.toISOString(),
          senderId: msg.senderId,
          userId: msg.recipientId,
          isAudio: msg.isAudio,
          isSystem: msg.isSystem,
          proposalId: msg.proposalId,
          proposalStatus: msg.proposal?.status ?? null,
          initiator: msg.proposal?.initiator ?? null,
          sender: {
            name:
              `${msg.senderUser?.firstName ?? ""} ${msg.senderUser?.lastName ?? ""}`.trim() ||
              "Unknown User",
            profileImage: msg.senderUser?.profileImage ?? null,
            isProfessional:
              !!msg.senderUser?.professionalApplication?.[0]?.professionalId,
            odI:
              msg.senderUser?.professionalApplication?.[0]?.professionalId ??
              null,
          },
        }))
        .reverse(); // Return in chronological order

      response.hasMore = messages.length === limit;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Fetch conversation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH - Mark conversation as read
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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
      select: { userId1: true, userId2: true, readBy: true },
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

    const currentReadBy =
      (conversation.readBy as Record<string, string> | null) || {};
    currentReadBy[session.user.id] = new Date().toISOString();

    await prisma.conversation.update({
      where: { id },
      data: { readBy: currentReadBy },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Mark as read error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
