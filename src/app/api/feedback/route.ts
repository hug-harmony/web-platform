// src/app/api/feedback/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import {
  FEEDBACK_CATEGORIES,
  OPERATION_STATUSES,
  PRIORITIES,
} from "@/types/operations";

// Validation schema for creating feedback
const createFeedbackSchema = z.object({
  category: z.enum(FEEDBACK_CATEGORIES),
  subject: z
    .string()
    .min(3, "Subject must be at least 3 characters")
    .max(200, "Subject too long"),
  message: z
    .string()
    .min(10, "Message must be at least 10 characters")
    .max(5000, "Message too long"),
});

// GET - Fetch user's own feedback submissions
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {
      userId: session.user.id,
    };

    if (
      status &&
      OPERATION_STATUSES.includes(status as (typeof OPERATION_STATUSES)[number])
    ) {
      where.status = status;
    }

    // Fetch feedback with pagination
    const [feedback, total] = await Promise.all([
      prisma.feedback.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              profileImage: true,
            },
          },
          adminUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              profileImage: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.feedback.count({ where }),
    ]);

    return NextResponse.json({
      feedback,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Fetch feedback error:", error);
    return NextResponse.json(
      { error: "Failed to fetch feedback" },
      { status: 500 }
    );
  }
}

// POST - Create new feedback
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = createFeedbackSchema.parse(body);

    // Check for spam - limit to 5 feedback per day per user
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const feedbackToday = await prisma.feedback.count({
      where: {
        userId: session.user.id,
        createdAt: { gte: today },
      },
    });

    if (feedbackToday >= 5) {
      return NextResponse.json(
        {
          error:
            "You've reached the daily feedback limit. Please try again tomorrow.",
        },
        { status: 429 }
      );
    }

    // Determine priority based on category
    let priority: (typeof PRIORITIES)[number] = "normal";
    if (validated.category === "bug") {
      priority = "high";
    } else if (validated.category === "complaint") {
      priority = "high";
    }

    const feedback = await prisma.feedback.create({
      data: {
        userId: session.user.id,
        category: validated.category,
        subject: validated.subject,
        message: validated.message,
        status: "pending",
        priority,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profileImage: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Feedback submitted successfully",
      feedback,
    });
  } catch (error) {
    console.error("Create feedback error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to submit feedback" },
      { status: 500 }
    );
  }
}
