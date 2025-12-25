// src/app/api/blocks/[targetId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const unblockSchema = z.object({
  targetType: z.enum(["user", "professional"]).optional().default("user"),
});

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ targetId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Await params before accessing its properties (Next.js 15 requirement)
  const { targetId } = await params;

  try {
    const body = await request.json().catch(() => ({}));
    const { targetType } = unblockSchema.parse(body);

    let blockedUserId: string;
    if (targetType === "professional") {
      const application = await prisma.professionalApplication.findFirst({
        where: { professionalId: targetId },
        select: { userId: true },
      });
      if (!application)
        return NextResponse.json(
          { error: "Professional not found" },
          { status: 404 }
        );
      blockedUserId = application.userId;
    } else {
      blockedUserId = targetId;
    }

    const existing = await prisma.block.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: session.user.id,
          blockedId: blockedUserId,
        },
      },
    });

    if (!existing)
      return NextResponse.json({ error: "Block not found" }, { status: 404 });

    await prisma.block.delete({
      where: {
        blockerId_blockedId: {
          blockerId: session.user.id,
          blockedId: blockedUserId,
        },
      },
    });

    return NextResponse.json({ message: "User unblocked successfully" });
  } catch (err) {
    console.error("Unblock error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ targetId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Await params before accessing its properties (Next.js 15 requirement)
  const { targetId } = await params;
  const targetType = request.nextUrl.searchParams.get("targetType") || "user";

  try {
    let blockedUserId: string;
    if (targetType === "professional") {
      const application = await prisma.professionalApplication.findFirst({
        where: { professionalId: targetId },
        select: { userId: true },
      });
      if (!application) return NextResponse.json(false);
      blockedUserId = application.userId;
    } else {
      blockedUserId = targetId;
    }

    const block = await prisma.block.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: session.user.id,
          blockedId: blockedUserId,
        },
      },
    });

    return NextResponse.json({ isBlocked: !!block });
  } catch (err) {
    console.error("Block check error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
