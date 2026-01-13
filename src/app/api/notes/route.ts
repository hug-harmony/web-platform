// src\app\api\notes\route.ts
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const schema = z
  .object({
    targetUserId: z.string().optional(),
    targetProfessionalId: z.string().optional(),
    content: z.string().min(1, "Content is required"),
  })
  .refine((data) => data.targetUserId || data.targetProfessionalId, {
    message: "Either targetUserId or targetProfessionalId is required",
  });

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const data = schema.parse(await request.json());

    const note = await prisma.note.create({
      data: {
        authorId: session.user.id,
        targetUserId: data.targetUserId,
        targetProfessionalId: data.targetProfessionalId,
        content: data.content,
      },
    });

    return NextResponse.json({ message: "Note saved successfully", note });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    console.error("Note creation error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const searchParams = request.nextUrl.searchParams;
  const targetType = searchParams.get("targetType");
  const targetId = searchParams.get("targetId");

  try {
    const whereClause: Prisma.NoteWhereInput = { authorId: session.user.id };
    if (targetType && targetId) {
      if (targetType === "user") {
        whereClause.targetUserId = targetId;
      } else if (targetType === "professional") {
        whereClause.targetProfessionalId = targetId;
      }
    }

    const notes = await prisma.note.findMany({
      where: whereClause,
      include: {
        targetUser: { select: { name: true } },
        targetProfessional: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const formattedNotes = notes.map((note) => ({
      id: note.id,
      content: note.content,
      createdAt: note.createdAt.toISOString(),
      targetType: note.targetUserId ? "user" : "professional",
      targetName:
        note.targetUser?.name || note.targetProfessional?.name || "Unknown",
      targetId: note.targetUserId || note.targetProfessionalId || "",
    }));

    return NextResponse.json(formattedNotes);
  } catch (err) {
    console.error("Note fetch error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
