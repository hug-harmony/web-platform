import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    console.error("Request body parse error:", error);
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { conversationId, text, recipientId, imageUrl } = body;
  if (!conversationId || (!text && !imageUrl) || !recipientId) {
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

  try {
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
    if (!isUserParticipant) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const message = await prisma.message.create({
      data: {
        text: text || "",
        senderId: session.user.id,
        recipientId,
        conversationId,
        imageUrl,
        isAudio: false,
      },
      include: {
        senderUser: { select: { firstName: true, lastName: true } },
      },
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    if (supabase) {
      const notification = {
        id: message.id,
        type: "message",
        content: `New message from ${message.senderUser?.firstName || "User"}: ${text || "Image message"}`,
        timestamp: new Date().toISOString(),
        unread: true,
        relatedid: conversationId,
      };
      const { error } = await supabase
        .from("notifications")
        .insert([notification]);
      if (error) {
        console.error("Supabase notification insert error:", error);
      }
    }

    return NextResponse.json({
      ...message,
      sender: {
        name:
          `${message.senderUser?.firstName || ""} ${message.senderUser?.lastName || ""}`.trim() ||
          "Unknown User",
      },
    });
  } catch (error) {
    console.error("Send message error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
