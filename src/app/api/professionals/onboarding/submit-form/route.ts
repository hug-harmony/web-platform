// app/api/professionals/onboarding/submit-form/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import {
  getProOnboardingVideo,
  getOrCreateProVideoWatch,
} from "@/lib/onboarding";

const formSchema = z.object({
  rate: z
    .string()
    .transform((v) => parseFloat(v))
    .refine((v) => !isNaN(v) && v > 0, "Rate must be greater than 0"),
  venue: z.enum(["host", "visit"], {
    required_error: "Venue is required",
    invalid_type_error: "Venue must be 'host' or 'visit'",
  }),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { rate, venue } = formSchema.parse(await req.json());
    const userId = session.user.id;

    const video = await getProOnboardingVideo();
    if (!video) {
      return NextResponse.json(
        { error: "Onboarding video not configured" },
        { status: 500 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.specialistApplication.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (existing) {
        await tx.trainingVideoWatch.deleteMany({
          where: { applicationId: existing.id },
        });
        await tx.specialistApplication.delete({ where: { id: existing.id } });
      }

      const app = await tx.specialistApplication.create({
        data: {
          userId,
          rate,
          venue,
          status: "VIDEO_PENDING",
          submittedAt: new Date(),
        },
      });

      await getOrCreateProVideoWatch({
        userId,
        videoId: video.id,
        applicationId: app.id,
      });

      return app;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error submitting form:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors.map((e) => e.message).join(", ") },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
