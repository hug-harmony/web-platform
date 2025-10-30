// app/api/trainingvideos/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const isAdminFetch = searchParams.get("admin") === "true";

    if (isAdminFetch && !session.user.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const videos = await prisma.trainingVideo.findMany({
      where: isAdminFetch ? {} : { isActive: true },
      orderBy: { createdAt: "desc" },
      include: {
        watches: {
          where: { userId: session.user.id },
          select: { watchedSec: true, isCompleted: true },
        },
      },
    });

    // Attach user progress to each video (flatten for frontend)
    const videosWithProgress = videos.map((video) => {
      const watch = video.watches[0];
      return {
        ...video,
        userProgress: watch
          ? { watchedSec: watch.watchedSec, isCompleted: watch.isCompleted }
          : { watchedSec: 0, isCompleted: false },
      };
    });

    return NextResponse.json(videosWithProgress);
  } catch (error) {
    console.error("GET trainingvideos error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user.isAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Admin only" },
        { status: 403 }
      );
    }

    const data = await req.json();
    const { name, url, durationSec } = data;

    if (!name || !url) {
      return NextResponse.json(
        { error: "Name and URL are required" },
        { status: 400 }
      );
    }

    const video = await prisma.trainingVideo.create({
      data: {
        name,
        url,
        durationSec: durationSec ? Number(durationSec) : null,
        isActive: true,
      },
    });

    return NextResponse.json(video, { status: 201 });
  } catch (error) {
    console.error("POST trainingvideos error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
