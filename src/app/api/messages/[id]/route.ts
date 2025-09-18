import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = request.nextUrl.pathname.split("/").pop();
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

    const messages = await prisma.message.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: "asc" },
      include: {
        senderUser: { select: { firstName: true, lastName: true } },
        proposal: { select: { status: true } },
      },
    });

    return NextResponse.json(
      messages.map((msg) => ({
        id: msg.id,
        text: msg.text,
        imageUrl: msg.imageUrl,
        createdAt: msg.createdAt.toISOString(), // Ensure string output
        senderId: msg.senderId,
        userId: msg.recipientId,
        isAudio: msg.isAudio,
        proposalId: msg.proposalId,
        proposalStatus: msg.proposal?.status,
        sender: {
          name:
            `${msg.senderUser?.firstName || ""} ${msg.senderUser?.lastName || ""}`.trim() ||
            "Unknown User",
        },
      }))
    );
  } catch (error) {
    console.error("Fetch messages error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
