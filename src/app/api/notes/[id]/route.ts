/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  content: z.string().min(1, "Content is required"),
});

export async function PATCH(request: NextRequest, { params }: any) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = params;

  try {
    const { content } = schema.parse(await request.json());

    const note = await prisma.note.findUnique({ where: { id } });
    if (!note)
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    if (note.authorId !== session.user.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const updated = await prisma.note.update({
      where: { id },
      data: { content },
    });

    return NextResponse.json({ message: "Note updated successfully", updated });
  } catch (err) {
    console.error("Note update error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: any) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = params;

  try {
    const note = await prisma.note.findUnique({ where: { id } });
    if (!note)
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    if (note.authorId !== session.user.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    await prisma.note.delete({ where: { id } });

    return NextResponse.json({ message: "Note deleted successfully" });
  } catch (err) {
    console.error("Note delete error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
