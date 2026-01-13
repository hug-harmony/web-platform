// src/app/api/admin/messages/search/route.ts
// Global message search API for admin messaging oversight

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
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
    const query = searchParams.get("q");
    const filter = searchParams.get("filter"); // "today", "week", "month", "all"
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const skip = (page - 1) * limit;

    if (!query || query.length < 2) {
        return NextResponse.json(
            { error: "Search query must be at least 2 characters" },
            { status: 400 }
        );
    }

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

        // Build where clause for message search
        const whereClause: Prisma.MessageWhereInput = {
            text: { contains: query, mode: "insensitive" },
        };

        if (Object.keys(dateFilter).length > 0) {
            whereClause.createdAt = dateFilter;
        }

        // Get total count for pagination
        const totalCount = await prisma.message.count({
            where: whereClause,
        });

        // Fetch messages with conversation and sender details
        const messages = await prisma.message.findMany({
            where: whereClause,
            include: {
                conversation: {
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
                    },
                },
            },
            orderBy: { createdAt: "desc" },
            skip,
            take: limit,
        });

        // Format results with highlighted text
        const formattedMessages = messages.map((msg) => {
            // Create highlighted text with the search term
            const regex = new RegExp(`(${query})`, "gi");
            const highlightedText = msg.text.replace(regex, "**$1**");

            // Determine sender info
            const sender =
                msg.senderId === msg.conversation.user1.id
                    ? msg.conversation.user1
                    : msg.conversation.user2;

            return {
                id: msg.id,
                text: msg.text,
                highlightedText,
                createdAt: msg.createdAt.toISOString(),
                conversationId: msg.conversationId,
                sender: {
                    id: sender.id,
                    name: `${sender.firstName} ${sender.lastName}`,
                    email: sender.email,
                    profileImage: sender.profileImage,
                    isSuspended: sender.status === "suspended",
                },
                recipient: {
                    id:
                        msg.senderId === msg.conversation.user1.id
                            ? msg.conversation.user2.id
                            : msg.conversation.user1.id,
                    name:
                        msg.senderId === msg.conversation.user1.id
                            ? `${msg.conversation.user2.firstName} ${msg.conversation.user2.lastName}`
                            : `${msg.conversation.user1.firstName} ${msg.conversation.user1.lastName}`,
                },
            };
        });

        return NextResponse.json({
            results: formattedMessages,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages: Math.ceil(totalCount / limit),
                hasMore: skip + messages.length < totalCount,
            },
            query,
        });
    } catch (error) {
        console.error("Admin global message search error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
