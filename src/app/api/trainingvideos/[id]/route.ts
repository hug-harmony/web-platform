// app/api/trainingvideos/[id]/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // VALIDATE ID
    if (!id || id === "undefined" || id.length !== 24) {
      return NextResponse.json({ error: "Invalid video ID" }, { status: 400 });
    }

    const video = await prisma.trainingVideo.findUnique({
      where: { id },
      include: {
        watches: {
          where: { userId: session.user.id },
          select: { watchedSec: true, isCompleted: true },
        },
      },
    });

    if (!video) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (!video.isActive && !session.user.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const watch = video.watches[0];
    const videoWithProgress = {
      ...video,
      userProgress: watch
        ? { watchedSec: watch.watchedSec, isCompleted: watch.isCompleted }
        : { watchedSec: 0, isCompleted: false },
    };

    return NextResponse.json(videoWithProgress);
  } catch (error) {
    console.error("GET trainingvideos/[id] error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user.isAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Admin only" },
        { status: 403 }
      );
    }

    const { id } = await params;

    // VALIDATE ID
    if (!id || id === "undefined" || id.length !== 24) {
      return NextResponse.json({ error: "Invalid video ID" }, { status: 400 });
    }

    const data = await req.json();

    const video = await prisma.trainingVideo.update({
      where: { id },
      data,
    });

    return NextResponse.json(video);
  } catch (error) {
    console.error("PATCH trainingvideos/[id] error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user.isAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Admin only" },
        { status: 403 }
      );
    }

    const { id } = await params;

    // VALIDATE ID
    if (!id || id === "undefined" || id.length !== 24) {
      return NextResponse.json({ error: "Invalid video ID" }, { status: 400 });
    }

    await prisma.trainingVideo.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("DELETE trainingvideos/[id] error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
