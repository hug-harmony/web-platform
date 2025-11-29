import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

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

    // Create notification in Supabase
    if (supabase) {
      try {
        const senderName = message.senderUser?.firstName || "Someone";
        const messagePreview = text
          ? text.length > 50
            ? `${text.substring(0, 50)}...`
            : text
          : "Sent an image";

        const { error } = await supabase.from("notifications").insert({
          userid: recipientId, // lowercase - recipient receives the notification
          senderid: session.user.id, // lowercase - who sent the message
          type: "message",
          content: `${senderName}: ${messagePreview}`,
          unread: true,
          relatedid: conversationId, // lowercase - link to conversation
        });

        if (error) {
          console.error("Supabase notification insert error:", error);
        } else {
          console.log("Message notification created successfully");
        }
      } catch (notifError) {
        console.error("Notification creation error:", notifError);
        // Don't fail the request if notification fails
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
