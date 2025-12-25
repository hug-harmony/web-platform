// src/app/api/blocks/route.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const blockSchema = z.object({
  targetId: z.string(),
  targetType: z.enum(["user", "professional"]),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { targetId, targetType } = blockSchema.parse(await request.json());

    // Resolve targetUserId (professionals are linked via ProfessionalApplication)
    let targetUserId: string;
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
      targetUserId = application.userId;
    } else {
      targetUserId = targetId;
    }

    if (targetUserId === session.user.id)
      return NextResponse.json(
        { error: "Cannot block yourself" },
        { status: 400 }
      );

    const block = await prisma.block.create({
      data: {
        blockerId: session.user.id,
        blockedId: targetUserId,
      },
    });

    return NextResponse.json(
      { message: "User blocked successfully", block },
      { status: 201 }
    );
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    if (err.code === "P2002") {
      // Unique constraint violation (already blocked)
      return NextResponse.json({ error: "Already blocked" }, { status: 409 });
    }
    console.error("Block creation error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const blocks = await prisma.block.findMany({
      where: { blockerId: session.user.id },
      include: {
        blocked: {
          select: { id: true, name: true, profileImage: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formattedBlocks = blocks.map((block) => ({
      targetId: block.blockedId,
      targetType: "user" as const, // all resolved to users
      targetName: block.blocked.name || "Unknown User",
      targetImage: block.blocked.profileImage || null,
      blockedAt: block.createdAt.toISOString(),
    }));

    return NextResponse.json(formattedBlocks);
  } catch (err) {
    console.error("Blocked list fetch error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
