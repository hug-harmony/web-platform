import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { conversationId, text, recipientId } = await request.json();
    if (!conversationId || !text || !recipientId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (
      !/^[0-9a-fA-F]{24}$/.test(conversationId) ||
      !/^[0-9a-fA-F]{24}$/.test(recipientId)
    ) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    const isUserParticipant =
      conversation.userId1 === session.user.id ||
      conversation.userId2 === session.user.id;
    const isSpecialistParticipant =
      conversation.specialistId1 === session.user.id ||
      conversation.specialistId2 === session.user.id;
    if (!isUserParticipant && !isSpecialistParticipant) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const message = await prisma.message.create({
      data: {
        text,
        senderId: session.user.id,
        recipientId,
        conversationId,
      },
      include: {
        senderUser: { select: { firstName: true, lastName: true } },
        senderSpecialist: { select: { name: true } },
      },
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json(message);
  } catch (error) {
    console.error("Send message error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
