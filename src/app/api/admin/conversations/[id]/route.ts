// src/app/api/admin/conversations/[id]/route.ts
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

  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        user1: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profileImage: true,
            status: true,
            createdAt: true,
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
            createdAt: true,
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

    // Get report counts for each user
    const [user1Reports, user2Reports] = await Promise.all([
      prisma.report.count({
        where: { reportedUserId: conversation.user1.id },
      }),
      prisma.report.count({
        where: { reportedUserId: conversation.user2.id },
      }),
    ]);

    return NextResponse.json({
      id: conversation.id,
      user1: {
        id: conversation.user1.id,
        firstName: conversation.user1.firstName,
        lastName: conversation.user1.lastName,
        email: conversation.user1.email,
        profileImage: conversation.user1.profileImage,
        status: conversation.user1.status,
        isSuspended: conversation.user1.status === "suspended",
        reportCount: user1Reports,
        createdAt: conversation.user1.createdAt.toISOString(),
      },
      user2: {
        id: conversation.user2.id,
        firstName: conversation.user2.firstName,
        lastName: conversation.user2.lastName,
        email: conversation.user2.email,
        profileImage: conversation.user2.profileImage,
        status: conversation.user2.status,
        isSuspended: conversation.user2.status === "suspended",
        reportCount: user2Reports,
        createdAt: conversation.user2.createdAt.toISOString(),
      },
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Admin fetch conversation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
