import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma"; // Adjust path
import { authOptions } from "@/lib/auth"; // Adjust path

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ specialistId: string }> }
) {
  const { specialistId } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Find specialist's userId via SpecialistApplication
    const specialistApp = await prisma.specialistApplication.findFirst({
      where: { specialistId, status: "APPROVED" },
    });
    if (!specialistApp || !specialistApp.userId) {
      return NextResponse.json(
        { error: "Specialist not found or not approved" },
        { status: 404 }
      );
    }
    const specialistUserId = specialistApp.userId;

    // Find existing conversation
    let conversation = await prisma.conversation.findFirst({
      where: {
        OR: [
          { userId1: session.user.id, userId2: specialistUserId },
          { userId1: specialistUserId, userId2: session.user.id },
        ],
      },
    });

    // Create if not found
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          userId1: session.user.id,
          userId2: specialistUserId,
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
