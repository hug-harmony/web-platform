// src/app/api/admin/conversations/[id]/messages/search/route.ts
import { NextRequest, NextResponse } from "next/server";
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
  const query = searchParams.get("q");

  if (!query || query.trim().length < 2) {
    return NextResponse.json(
      { error: "Search query must be at least 2 characters" },
      { status: 400 }
    );
  }

  try {
    const messages = await prisma.message.findMany({
      where: {
        conversationId: id,
        text: { contains: query, mode: "insensitive" },
      },
      orderBy: { createdAt: "desc" },
      take: 100, // Limit search results
      include: {
        senderUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
      },
    });

    const formattedMessages = messages.map((msg) => ({
      id: msg.id,
      text: msg.text,
      createdAt: msg.createdAt.toISOString(),
      senderId: msg.senderId,
      sender: {
        id: msg.senderUser?.id,
        name:
          `${msg.senderUser?.firstName ?? ""} ${msg.senderUser?.lastName ?? ""}`.trim() ||
          "Unknown User",
        profileImage: msg.senderUser?.profileImage ?? null,
      },
      // Highlight matched text
      highlightedText: msg.text.replace(
        new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"),
        "**$1**"
      ),
    }));

    return NextResponse.json({
      results: formattedMessages,
      count: formattedMessages.length,
      query,
    });
  } catch (error) {
    console.error("Admin search messages error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
