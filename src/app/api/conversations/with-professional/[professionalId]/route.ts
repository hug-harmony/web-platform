// src\app\api\conversations\with-professional\[professionalId]\route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma"; // Adjust path
import { authOptions } from "@/lib/auth"; // Adjust path

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ professionalId: string }> }
) {
  const { professionalId } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Find professional's userId via ProfessionalApplication
    const professionalApp = await prisma.professionalApplication.findFirst({
      where: { professionalId, status: "APPROVED" },
    });
    if (!professionalApp || !professionalApp.userId) {
      return NextResponse.json(
        { error: "Professional not found or not approved" },
        { status: 404 }
      );
    }
    const professionalUserId = professionalApp.userId;

    // Find existing conversation
    let conversation = await prisma.conversation.findFirst({
      where: {
        OR: [
          { userId1: session.user.id, userId2: professionalUserId },
          { userId1: professionalUserId, userId2: session.user.id },
        ],
      },
    });

    // Create if not found
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          userId1: session.user.id,
          userId2: professionalUserId,
        },
      });
    }

    return NextResponse.json(
      { conversationId: conversation.id },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get conversation error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
