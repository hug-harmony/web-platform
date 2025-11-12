/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import {
  ProOnboardingStatus,
  AppointmentVenue,
  VenueType,
} from "@prisma/client";

const submitSchema = z.object({
  rate: z
    .string()
    .transform((v) => parseFloat(v))
    .refine((v) => !isNaN(v) && v > 0, "Rate must be > 0"),
  venue: z.enum(["host", "visit"] as const, {
    required_error: "Venue is required",
  }),
});

/* ------------------------------------------------------------------
   POST – submit application (rate + venue)
   ------------------------------------------------------------------ */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { rate, venue } = submitSchema.parse(await req.json());

    const application = await prisma.$transaction(async (tx) => {
      const existing = await tx.professionalApplication.findFirst({
        where: { userId: session.user.id },
        select: { id: true, status: true, professionalId: true },
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
        if (existing.professionalId) {
          await tx.professional.deleteMany({
            where: { id: existing.professionalId },
          });
        }
        await tx.professionalApplication.deleteMany({
          where: { id: existing.id },
        });
      }

      return await tx.professionalApplication.create({
        data: {
          userId: session.user.id,
          rate,
          venue,
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

/* ------------------------------------------------------------------
   GET – single (admin) OR list
   ------------------------------------------------------------------ */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const statusParam = (searchParams.get("status") ?? "all") as
      | ProOnboardingStatus
      | "all";
    const search = searchParams.get("search") ?? "";

    /* ---------- SINGLE APPLICATION DETAIL ---------- */
    if (id) {
      const app = await prisma.professionalApplication.findUnique({
        where: { id },
        include: {
          user: {
            select: { name: true, profileImage: true, biography: true },
          },
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
        id: app.id,
        name: app.user.name ?? "Unknown",
        avatarUrl: app.user.profileImage ?? null,
        biography: app.user.biography ?? "",
        rate: app.rate,
        venue: app.venue,
        status: app.status,
        createdAt: app.createdAt,
        submittedAt: app.submittedAt,
        videoWatchedAt: app.videoWatchedAt,
        quizPassedAt: app.quizPassedAt,
        video,
        quizAttempts: app.quizAttempts,
      });
    }

    /* ---------- LIST VIEW ---------- */
    const where: any = {};
    if (statusParam !== "all") where.status = statusParam;
    if (search)
      where.user = { name: { contains: search, mode: "insensitive" } };

    const apps = await prisma.professionalApplication.findMany({
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

/* ------------------------------------------------------------------
   PATCH – approve / reject (creates Professional on APPROVED)
   ------------------------------------------------------------------ */
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
      const app = await tx.professionalApplication.findUnique({
        where: { id },
        include: { user: true },
      });
      if (!app) throw new Error("Application not found");

      /* REJECT – clean up */
      if (status === "REJECTED") {
        if (app.professionalId)
          await tx.professional.deleteMany({
            where: { id: app.professionalId },
          });
        await tx.professionalApplication.deleteMany({ where: { id } });
        return { ...app, status: "REJECTED", professionalId: null };
      }

      /* APPROVE – create Professional if needed */
      let professionalId: string | null = app.professionalId;
      if (status === "APPROVED" && !app.professionalId) {
        if (!app.user.name) throw new Error("User must have a name");

        const professional = await tx.professional.create({
          data: {
            name: app.user.name,
            biography: app.user.biography ?? "",
            rate: app.rate,
            venue: app.venue === "host" ? VenueType.host : VenueType.visit,
            image: app.user.profileImage ?? null,
          },
        });
        professionalId = professional.id;
      }

      return await tx.professionalApplication.update({
        where: { id },
        data: { status, professionalId },
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
