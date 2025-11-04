import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const application = await prisma.specialistApplication.findUnique({
      where: { userId },
      select: {
        id: true,
        status: true,
        submittedAt: true,
        videoWatchedAt: true,
        quizPassedAt: true,
      },
    });

    if (!application) {
      return NextResponse.json({ step: "FORM", application: null });
    }

    // Fetch video watch separately
    const watch = await prisma.trainingVideoWatch.findFirst({
      where: { applicationId: application.id },
      include: { video: true },
      orderBy: { lastWatchedAt: "desc" },
    });

    const video = watch
      ? {
          id: watch.video.id,
          name: watch.video.name,
          url: watch.video.url,
          durationSec: watch.video.durationSec ?? 0,
          watchedSec: watch.watchedSec,
          isCompleted: watch.isCompleted,
        }
      : null;

    return NextResponse.json({
      step: application.status,
      application: {
        id: application.id,
        status: application.status,
        submittedAt: application.submittedAt,
        videoWatchedAt: application.videoWatchedAt,
        quizPassedAt: application.quizPassedAt,
      },
      video,
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
