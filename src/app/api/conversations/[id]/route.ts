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
      include: {
        user1: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
        user2: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
      },
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

    // NEW: Determine and include professionalId if one participant is a professional
    const professionalApp1 = await prisma.professionalApplication.findFirst({
      where: { userId: conversation.userId1, status: "APPROVED" },
      select: { professionalId: true },
    });
    const professionalApp2 = await prisma.professionalApplication.findFirst({
      where: { userId: conversation.userId2, status: "APPROVED" },
      select: { professionalId: true },
    });

    const professionalId =
      professionalApp1?.professionalId ||
      professionalApp2?.professionalId ||
      null;

    return NextResponse.json({ ...conversation, professionalId });
  } catch (error) {
    console.error("Fetch conversation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
