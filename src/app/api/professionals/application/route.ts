// app/api/professionals/application/route.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { ProOnboardingStatus, VenueType } from "@prisma/client";
import {
  getProOnboardingVideo,
  getOrCreateProVideoWatch,
} from "@/lib/onboarding";

const submitSchema = z.object({
  rate: z
    .string()
    .transform((v) => parseFloat(v))
    .refine((v) => !isNaN(v) && v > 0, "Rate must be greater than 0")
    .refine((v) => v <= 10000, "Rate cannot exceed $10,000/hour"),
  venue: z.enum(["host", "visit", "both"] as const, {
    required_error: "Venue is required",
  }),
});

/* ------------------------------------------------------------------
   GET – User's own application OR admin list/detail
   Usage:
   - /api/professionals/applications?.[0]?me=true (user's own)
   - /api/professionals/application (admin list)
   - /api/professionals/applications?.[0]?id=xxx (admin detail)
   ------------------------------------------------------------------ */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const me = searchParams.get("me");
    const id = searchParams.get("id");

    /* ---------- USER'S OWN APPLICATION ---------- */
    if (me === "true") {
      const application = await prisma.professionalApplication.findFirst({
        where: { userId: session.user.id },
        select: {
          id: true,
          status: true,
          professionalId: true,
          rate: true,
          venue: true,
          submittedAt: true,
          videoWatchedAt: true,
          quizPassedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!application) {
        // Return 404 so frontend treats it as no application
        return NextResponse.json(
          { error: "No application found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        status: application.status,
        professionalId: application.professionalId,
        applications: {
          id: application.id,
          rate: application.rate,
          venue: application.venue,
          submittedAt: application.submittedAt,
          videoWatchedAt: application.videoWatchedAt,
          quizPassedAt: application.quizPassedAt,
          createdAt: application.createdAt,
          updatedAt: application.updatedAt,
        },
      });
    }

    /* ---------- ADMIN ONLY BELOW ---------- */
    if (!session.user.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const statusParam = (searchParams.get("status") ?? "all") as
      | ProOnboardingStatus
      | "all";
    const search = searchParams.get("search") ?? "";

    /* ---------- SINGLE APPLICATION DETAIL (ADMIN) ---------- */
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

      if (!app) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

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

    /* ---------- LIST VIEW (ADMIN) ---------- */
    const where: any = {};
    if (statusParam !== "all") {
      where.status = statusParam;
    }
    if (search) {
      where.user = { name: { contains: search, mode: "insensitive" } };
    }

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
          rate: a.rate,
          venue: a.venue,
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
          professionalId: a.professionalId,
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
   POST – Submit application (rate + venue)
   ------------------------------------------------------------------ */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has a name set
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, firstName: true, lastName: true },
    });

    const hasName = user?.name || user?.firstName || user?.lastName;
    if (!hasName) {
      return NextResponse.json(
        { error: "Please set your name in your profile before applying" },
        { status: 400 }
      );
    }

    // Parse and validate
    const body = await req.json();
    const parseResult = submitSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors.map((e) => e.message).join(", ") },
        { status: 400 }
      );
    }

    const { rate, venue } = parseResult.data;

    // Get onboarding video
    const video = await getProOnboardingVideo();
    if (!video) {
      return NextResponse.json(
        { error: "Onboarding video not configured. Please contact support." },
        { status: 500 }
      );
    }

    const application = await prisma.$transaction(async (tx) => {
      // Find existing application for this user
      const existing = await tx.professionalApplication.findUnique({
        where: { userId: session.user.id },
        select: { id: true, status: true, professionalId: true },
      });

      // Check for active/approved applications
      const blockedStatuses: ProOnboardingStatus[] = [
        "VIDEO_PENDING",
        "QUIZ_PENDING",
        "QUIZ_PASSED",
        "ADMIN_REVIEW",
        "APPROVED",
      ];

      if (existing && blockedStatuses.includes(existing.status)) {
        throw new Error(
          existing.status === "APPROVED"
            ? "You already have an approved application"
            : "You already have an active application in progress"
        );
      }

      // Clean up existing rejected/failed applications
      if (existing) {
        // Delete related records first
        await tx.trainingVideoWatch.deleteMany({
          where: { applicationId: existing.id },
        });
        await tx.proQuizAttempt.deleteMany({
          where: { applicationId: existing.id },
        });

        // Delete associated professional if exists
        if (existing.professionalId) {
          await tx.professional
            .delete({
              where: { id: existing.professionalId },
            })
            .catch(() => {
              // Ignore if professional doesn't exist
            });
        }

        // Delete the application
        await tx.professionalApplication.delete({
          where: { id: existing.id },
        });
      }

      // Also clean up any orphaned applications without professionalId
      // This prevents the unique constraint issue
      await tx.professionalApplication.deleteMany({
        where: {
          userId: { not: session.user.id },
          professionalId: null,
          status: { in: ["REJECTED", "SUSPENDED", "QUIZ_FAILED"] },
        },
      });

      // Create new application
      const app = await tx.professionalApplication.create({
        data: {
          userId: session.user.id,
          rate,
          venue: venue as VenueType,
          status: "VIDEO_PENDING",
          submittedAt: new Date(),
        },
      });

      // Create video watch record
      await getOrCreateProVideoWatch({
        userId: session.user.id,
        videoId: video.id,
        applicationId: app.id,
      });

      return app;
    });

    return NextResponse.json(
      {
        success: true,
        applications: {
          id: application.id,
          status: application.status,
          rate: application.rate,
          venue: application.venue,
        },
        nextStep: "/dashboard/edit-profile/professional-application/video",
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("POST error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors.map((e) => e.message).join(", ") },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      if (
        error.message.includes("already have") ||
        error.message.includes("in progress")
      ) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }

      // Handle unique constraint error gracefully
      if (error.message.includes("Unique constraint")) {
        return NextResponse.json(
          {
            error: "Please try again. If the issue persists, contact support.",
          },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to submit application" },
      { status: 500 }
    );
  }
}

/* ------------------------------------------------------------------
   PATCH – Approve / Reject (Admin only)
   ------------------------------------------------------------------ */
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const { id, status, rejectionReason } = z
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
          "SUSPENDED",
        ]),
        rejectionReason: z.string().optional(),
      })
      .parse(body);

    const updated = await prisma.$transaction(async (tx) => {
      const app = await tx.professionalApplication.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              firstName: true,
              email: true,
              profileImage: true,
              biography: true,
              location: true,
            },
          },
        },
      });

      if (!app) {
        throw new Error("Application not found");
      }

      const userName = app.user.name || app.user.firstName || "User";

      /* REJECT – clean up and notify */
      if (status === "REJECTED") {
        if (app.professionalId) {
          await tx.professional.deleteMany({
            where: { id: app.professionalId },
          });
        }

        // Update application status instead of deleting (keep for records)
        const updated = await tx.professionalApplication.update({
          where: { id },
          data: {
            status: "REJECTED",
            professionalId: null,
          },
          include: { user: { select: { name: true, email: true } } },
        });

        // Send rejection email (non-blocking)
        if (app.user.email) {
          import("@/lib/services/email").then(
            ({ sendApplicationRejectedEmail }) => {
              sendApplicationRejectedEmail(
                app.user.email,
                userName,
                rejectionReason || null
              ).catch(console.error);
            }
          );
        }

        return updated;
      }

      /* APPROVE – create Professional if needed and notify */
      let professionalId: string | null = app.professionalId;

      if (status === "APPROVED" && !app.professionalId) {
        if (!app.user.name && !app.user.firstName) {
          throw new Error("User must have a name");
        }

        const professional = await tx.professional.create({
          data: {
            name: app.user.name || app.user.firstName || "Professional",
            biography: app.user.biography ?? "",
            rate: app.rate,
            venue: app.venue,
            image: app.user.profileImage ?? null,
            location: app.user.location ?? null,
          },
        });

        professionalId = professional.id;

        // Send approval email (non-blocking)
        if (app.user.email) {
          import("@/lib/services/email").then(
            ({ sendApplicationApprovedEmail }) => {
              sendApplicationApprovedEmail(app.user.email, userName).catch(
                console.error
              );
            }
          );
        }
      }

      return await tx.professionalApplication.update({
        where: { id },
        data: { status, professionalId },
        include: { user: { select: { name: true, email: true } } },
      });
    });

    return NextResponse.json({
      success: true,
      applications: {
        id: updated.id,
        status: updated.status,
        name: updated.user?.name ?? "Unknown",
      },
    });
  } catch (error: unknown) {
    console.error("PATCH error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }

    if (error instanceof Error) {
      if (
        ["Application not found", "User must have a name"].includes(
          error.message
        )
      ) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
