// app/api/trainingvideos/[id]/watch/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: videoId } = await params;
    const { watchedSec } = await req.json();

    if (typeof watchedSec !== "number" || watchedSec < 0) {
      return NextResponse.json(
        { error: "Invalid watchedSec" },
        { status: 400 }
      );
    }

    const video = await prisma.trainingVideo.findUnique({
      where: { id: videoId },
      select: { id: true, durationSec: true, isActive: true },
    });

    if (!video || !video.isActive) {
      return NextResponse.json(
        { error: "Video not found or inactive" },
        { status: 404 }
      );
    }

    const isCompleted = video.durationSec
      ? watchedSec >= video.durationSec
      : false;

    const watch = await prisma.trainingVideoWatch.upsert({
      where: {
        userId_videoId: {
          userId: session.user.id,
          videoId,
        },
      },
      update: {
        watchedSec: { set: watchedSec },
        isCompleted,
      },
      create: {
        userId: session.user.id,
        videoId,
        watchedSec,
        isCompleted,
      },
    });

    return NextResponse.json({
      watchedSec: watch.watchedSec,
      isCompleted: watch.isCompleted,
    });
  } catch (error) {
    console.error("POST trainingvideos/[id]/watch error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
