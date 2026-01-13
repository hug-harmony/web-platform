// src/app/api/admin/conversations/[id]/messages/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify admin status
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });

  if (!user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
    return NextResponse.json(
      { error: "Invalid conversation ID" },
      { status: 400 }
    );
  }

  const { searchParams } = new URL(request.url);
  const filter = searchParams.get("filter"); // "today", "week", "month", "all"
  const search = searchParams.get("search");
  const cursor = searchParams.get("cursor");
  const limit = parseInt(searchParams.get("limit") || "50", 10);

  try {
    // Verify conversation exists
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Build date filter
    let dateFilter: { gte?: Date; lte?: Date } = {};
    const now = new Date();

    switch (filter) {
      case "today":
        dateFilter = {
          gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        };
        break;
      case "week":
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        dateFilter = { gte: weekAgo };
        break;
      case "month":
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        dateFilter = { gte: monthAgo };
        break;
      default:
        dateFilter = {};
    }

    // Build where clause
    const whereClause: Prisma.MessageWhereInput = {
      conversationId: id,
    };

    if (Object.keys(dateFilter).length > 0) {
      whereClause.createdAt = dateFilter;
    }

    // Search in message text
    if (search) {
      whereClause.text = { contains: search, mode: "insensitive" };
    }

    const messages = await prisma.message.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: limit,
      ...(cursor ? { cursor: { id: cursor } as const, skip: 1 } : {}),
      include: {
        proposal: { select: { status: true, initiator: true } },
        senderUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
            status: true,
          },
        },
      },
    });

    // Get total count for search results
    const totalCount = await prisma.message.count({
      where: whereClause,
    });

    const formattedMessages = messages.map((msg) => ({
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
        id: msg.senderUser?.id,
        name:
          `${msg.senderUser?.firstName ?? ""} ${msg.senderUser?.lastName ?? ""}`.trim() ||
          "Unknown User",
        profileImage: msg.senderUser?.profileImage ?? null,
        isSuspended: msg.senderUser?.status === "suspended",
      },
    }));

    return NextResponse.json({
      messages: formattedMessages.reverse(), // Return in chronological order
      pagination: {
        nextCursor:
          messages.length === limit ? messages[messages.length - 1]?.id : null,
        hasMore: messages.length === limit,
        totalCount,
      },
    });
  } catch (error) {
    console.error("Admin fetch messages error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
