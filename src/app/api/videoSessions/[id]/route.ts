// src/app/api/videoSessions/[id]/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Invalid session ID" }, { status: 400 });
  }

  try {
    const videoSession = await prisma.videoSession.findUnique({
      where: { id },
      include: {
        professional: {
          select: { id: true, name: true },
        },
        user: {
          select: { id: true, name: true, firstName: true, lastName: true },
        },
      },
    });

    if (!videoSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json(videoSession);
  } catch (error) {
    console.error("Get video session error:", error);
    return NextResponse.json(
      { error: "Failed to fetch video session" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Invalid session ID" }, { status: 400 });
  }

  try {
    const { status } = await request.json();

    const videoSession = await prisma.videoSession.update({
      where: { id },
      data: { status, updatedAt: new Date() },
      include: {
        professional: { select: { name: true, id: true } },
      },
    });

    return NextResponse.json(videoSession);
  } catch (error) {
    console.error("Update video session error:", error);
    return NextResponse.json(
      { error: "Failed to update video session" },
      { status: 500 }
    );
  }
}
