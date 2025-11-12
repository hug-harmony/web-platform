// lib/messages.ts
import prisma from "@/lib/prisma";

/**
 * Send a system message between client and professional
 */
export async function sendSystemMessage({
  conversationId,
  senderId,
  recipientId,
  text,
}: {
  conversationId: string;
  senderId: string;
  recipientId: string;
  text: string;
}) {
  const message = await prisma.message.create({
    data: {
      text,
      senderId,
      recipientId,
      conversationId,
      isAudio: false,
      isSystem: true,
    },
  });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  return message;
}
