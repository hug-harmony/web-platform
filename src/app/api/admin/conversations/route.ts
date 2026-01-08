// src/app/api/admin/conversations/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET(request: NextRequest) {
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

  const { searchParams } = new URL(request.url);
  const filter = searchParams.get("filter"); // "today", "week", "month", "all"
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const skip = (page - 1) * limit;

  try {
    // Build date filter
    let dateFilter: { gte?: Date } = {};
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: any = {};

    if (Object.keys(dateFilter).length > 0) {
      whereClause.updatedAt = dateFilter;
    }

    // Search by participant names
    if (search) {
      whereClause.OR = [
        {
          user1: {
            OR: [
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          },
        },
        {
          user2: {
            OR: [
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          },
        },
      ];
    }

    // Get total count for pagination
    const totalCount = await prisma.conversation.count({
      where: whereClause,
    });

    // Fetch conversations with includes
    const conversations = await prisma.conversation.findMany({
      where: whereClause,
      include: {
        user1: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profileImage: true,
            status: true,
          },
        },
        user2: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profileImage: true,
            status: true,
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
      skip,
      take: limit,
    });

    const formattedConversations = conversations.map((conv) => ({
      id: conv.id,
      user1: {
        id: conv.user1.id,
        firstName: conv.user1.firstName,
        lastName: conv.user1.lastName,
        email: conv.user1.email,
        profileImage: conv.user1.profileImage,
        status: conv.user1.status,
        isSuspended: conv.user1.status === "suspended",
      },
      user2: {
        id: conv.user2.id,
        firstName: conv.user2.firstName,
        lastName: conv.user2.lastName,
        email: conv.user2.email,
        profileImage: conv.user2.profileImage,
        status: conv.user2.status,
        isSuspended: conv.user2.status === "suspended",
      },
      lastMessage: conv.messages[0]
        ? {
            text: conv.messages[0].text,
            createdAt: conv.messages[0].createdAt.toISOString(),
            senderId: conv.messages[0].senderId,
          }
        : null,
      messageCount: conv._count.messages,
      updatedAt: conv.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      conversations: formattedConversations,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: skip + conversations.length < totalCount,
      },
    });
  } catch (error) {
    console.error("Admin fetch conversations error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
