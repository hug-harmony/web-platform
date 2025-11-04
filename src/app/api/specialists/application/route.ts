/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { ProOnboardingStatus } from "@prisma/client";

const specialistApplicationSchema = z.object({
  biography: z.string().min(1, "Biography is required"),
  rate: z
    .string()
    .transform((val) => parseFloat(val))
    .refine((val) => !isNaN(val) && val >= 0, {
      message: "Rate must be non-negative",
    }),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { biography, rate } = specialistApplicationSchema.parse(
      await req.json()
    );

    const application = await prisma.$transaction(async (tx) => {
      const existing = await tx.specialistApplication.findFirst({
        where: { userId: session.user.id },
        select: { id: true, status: true, specialistId: true },
      });

      const activeStatuses: ProOnboardingStatus[] = [
        "FORM_PENDING",
        "FORM_SUBMITTED",
        "VIDEO_PENDING",
        "QUIZ_PENDING",
        "QUIZ_PASSED",
        "QUIZ_FAILED",
        "ADMIN_REVIEW",
        "APPROVED",
      ];

      if (existing && activeStatuses.includes(existing.status)) {
        throw new Error("You already have an active application");
      }

      if (existing) {
        if (existing.specialistId) {
          await tx.specialist.deleteMany({
            where: { id: existing.specialistId },
          });
        }
        await tx.specialistApplication.deleteMany({
          where: { id: existing.id },
        });
      }

      return await tx.specialistApplication.create({
        data: {
          userId: session.user.id,
          biography,
          rate,
          status: "VIDEO_PENDING",
          submittedAt: new Date(),
        },
      });
    });

    return NextResponse.json(application, { status: 201 });
  } catch (error: unknown) {
    console.error("POST error:", error);
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: error.errors }, { status: 400 });
    if (error instanceof Error && error.message.includes("already have")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const status = (searchParams.get("status") ?? "all") as
      | ProOnboardingStatus
      | "all";
    const search = searchParams.get("search") ?? "";

    if (id) {
      const app = await prisma.specialistApplication.findUnique({
        where: { id },
        include: {
          user: { select: { name: true, profileImage: true } },
          quizAttempts: {
            orderBy: { attemptedAt: "desc" },
          },
        },
      });

      if (!app)
        return NextResponse.json({ error: "Not found" }, { status: 404 });

      const watch = await prisma.trainingVideoWatch.findFirst({
        where: { applicationId: app.id },
        include: { video: true },
        orderBy: { lastWatchedAt: "desc" },
      });

      const video = watch
        ? {
            watchedSec: watch.watchedSec,
            durationSec: watch.video.durationSec ?? 0,
            isCompleted: watch.isCompleted,
          }
        : null;

      return NextResponse.json({
        ...app,
        name: app.user.name ?? "Unknown",
        video,
        quizAttempts: app.quizAttempts,
      });
    }

    // List view
    const where: any = {};
    if (status !== "all") where.status = status;
    if (search)
      where.user = { name: { contains: search, mode: "insensitive" } };

    const apps = await prisma.specialistApplication.findMany({
      where,
      include: {
        user: { select: { name: true, profileImage: true } },
        quizAttempts: {
          select: { score: true, attemptedAt: true, nextEligibleAt: true },
          orderBy: { attemptedAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = await Promise.all(
      apps.map(async (a) => {
        const watch = await prisma.trainingVideoWatch.findFirst({
          where: { applicationId: a.id },
          include: { video: true },
          orderBy: { lastWatchedAt: "desc" },
        });

        return {
          id: a.id,
          name: a.user?.name ?? "Unknown",
          avatarUrl: a.user?.profileImage ?? null,
          status: a.status,
          createdAt: a.createdAt,
          submittedAt: a.submittedAt,
          videoWatchedAt: a.videoWatchedAt,
          quizPassedAt: a.quizPassedAt,
          video: watch
            ? {
                watchedSec: watch.watchedSec,
                durationSec: watch.video.durationSec ?? 0,
                isCompleted: watch.isCompleted,
              }
            : null,
          latestQuiz: a.quizAttempts[0] ?? null,
        };
      })
    );

    return NextResponse.json(formatted);
  } catch (error: unknown) {
    console.error("GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, status } = z
      .object({
        id: z.string(),
        status: z.enum([
          "FORM_PENDING",
          "FORM_SUBMITTED",
          "VIDEO_PENDING",
          "QUIZ_PENDING",
          "QUIZ_PASSED",
          "QUIZ_FAILED",
          "ADMIN_REVIEW",
          "APPROVED",
          "REJECTED",
        ]),
      })
      .parse(await req.json());

    const updated = await prisma.$transaction(async (tx) => {
      const app = await tx.specialistApplication.findUnique({
        where: { id },
        include: { user: true },
      });
      if (!app) throw new Error("Application not found");

      if (status === "REJECTED") {
        if (app.specialistId)
          await tx.specialist.deleteMany({ where: { id: app.specialistId } });
        await tx.specialistApplication.deleteMany({ where: { id } });
        return { ...app, status: "REJECTED", specialistId: null };
      }

      let specialistId: string | null = app.specialistId;
      if (status === "APPROVED" && !app.specialistId) {
        if (!app.user.name) throw new Error("User must have a name");
        const specialist = await tx.specialist.create({
          data: {
            name: app.user.name,
            biography: app.biography,
            rate: app.rate,
            image: app.user.profileImage ?? null,
          },
        });
        specialistId = specialist.id;
      }

      return await tx.specialistApplication.update({
        where: { id },
        data: { status, specialistId },
        include: { user: { select: { name: true } } },
      });
    });

    return NextResponse.json({
      ...updated,
      name: updated.user.name ?? "Unknown",
    });
  } catch (error: unknown) {
    console.error("PATCH error:", error);
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: error.errors }, { status: 400 });
    if (
      error instanceof Error &&
      ["Application not found", "User must have a name"].includes(error.message)
    ) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
