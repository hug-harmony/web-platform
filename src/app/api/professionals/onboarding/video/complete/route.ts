import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  watchedSec: z.number().int().min(0),
  isCompleted: z.boolean(),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { watchedSec, isCompleted } = schema.parse(await req.json());
    const userId = session.user.id;

    const app = await prisma.professionalApplication.findUnique({
      where: { userId },
      select: { id: true, status: true },
    });

    if (!app || app.status !== "VIDEO_PENDING") {
      return NextResponse.json({ error: "Invalid state" }, { status: 400 });
    }

    const watch = await prisma.trainingVideoWatch.findFirst({
      where: { applicationId: app.id },
      select: { videoId: true },
    });

    if (!watch?.videoId) {
      return NextResponse.json({ error: "No video linked" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.trainingVideoWatch.update({
        where: { userId_videoId: { userId, videoId: watch.videoId } },
        data: { watchedSec, isCompleted, lastWatchedAt: new Date() },
      });

      if (isCompleted) {
        await tx.professionalApplication.update({
          where: { id: app.id },
          data: { status: "QUIZ_PENDING", videoWatchedAt: new Date() },
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error:", error);
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: error.errors }, { status: 400 });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
