/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const schema = z
  .object({
    targetUserId: z.string().optional(),
    targetSpecialistId: z.string().optional(),
    content: z.string().min(1, "Content is required"),
  })
  .refine((data) => data.targetUserId || data.targetSpecialistId, {
    message: "Either targetUserId or targetSpecialistId is required",
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
        targetSpecialistId: data.targetSpecialistId,
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

  try {
    const notes = await prisma.note.findMany({
      where: { authorId: session.user.id },
      include: {
        targetUser: { select: { name: true } },
        targetSpecialist: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Map to include targetType and targetName
    const formattedNotes = notes.map((note) => ({
      id: note.id,
      content: note.content,
      createdAt: note.createdAt.toISOString(),
      targetType: note.targetUserId ? "user" : "professional",
      targetName:
        note.targetUser?.name || note.targetSpecialist?.name || "Unknown",
      targetId: note.targetUserId || note.targetSpecialistId || "",
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
