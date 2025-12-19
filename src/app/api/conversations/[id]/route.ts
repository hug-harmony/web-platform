// src/app/api/conversations/[id]/route.ts
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
  const before = searchParams.get("before");

  try {
    // First, fetch the conversation with user details
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

    // Check if either user is a professional
    const [profApp1, profApp2] = await Promise.all([
      prisma.professionalApplication.findFirst({
        where: { userId: conversation.userId1, status: "APPROVED" },
        select: { professionalId: true },
      }),
      prisma.professionalApplication.findFirst({
        where: { userId: conversation.userId2, status: "APPROVED" },
        select: { professionalId: true },
      }),
    ]);

    const professionalId =
      profApp1?.professionalId || profApp2?.professionalId || null;

    // Build response
    const response: Record<string, unknown> = {
      id: conversation.id,
      user1: {
        id: conversation.user1.id,
        firstName: conversation.user1.firstName,
        lastName: conversation.user1.lastName,
        profileImage: conversation.user1.profileImage,
        lastOnline: conversation.user1.lastOnline,
        isProfessional: !!profApp1?.professionalId,
      },
      user2: {
        id: conversation.user2.id,
        firstName: conversation.user2.firstName,
        lastName: conversation.user2.lastName,
        profileImage: conversation.user2.profileImage,
        lastOnline: conversation.user2.lastOnline,
        isProfessional: !!profApp2?.professionalId,
      },
      professionalId,
      userId1: conversation.userId1,
      userId2: conversation.userId2,
    };

    // Fetch messages if requested
    if (includeMessages) {
      const messages = await prisma.message.findMany({
        where: {
          conversationId: id,
          ...(before ? { createdAt: { lt: new Date(before) } } : {}),
        },
        orderBy: { createdAt: "desc" },
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
      });

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
              !!msg.senderUser?.professionalApplication?.professionalId,
            userId:
              msg.senderUser?.professionalApplication?.professionalId ?? null,
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
