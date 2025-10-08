/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const schema = z.object({
    content: z.string().min(1, "Content is required"),
  });

  try {
    const { content } = schema.parse(await request.json());
    const note = await prisma.note.findUnique({ where: { id: params.id } });
    if (!note || note.authorId !== session.user.id)
      return NextResponse.json(
        { error: "Note not found or unauthorized" },
        { status: 404 }
      );

    const updated = await prisma.note.update({
      where: { id: params.id },
      data: { content },
    });

    return NextResponse.json({ message: "Note updated successfully", updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    console.error("Note update error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const note = await prisma.note.findUnique({ where: { id: params.id } });
    if (!note || note.authorId !== session.user.id)
      return NextResponse.json(
        { error: "Note not found or unauthorized" },
        { status: 404 }
      );

    await prisma.note.delete({ where: { id: params.id } });

    return NextResponse.json({ message: "Note deleted successfully" });
  } catch (err) {
    console.error("Note delete error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
