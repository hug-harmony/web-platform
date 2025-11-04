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
  biography: z.string().min(1, "Biography is required"),
  rate: z
    .string()
    .transform((v) => parseFloat(v))
    .refine((v) => !isNaN(v) && v >= 0, "Rate must be non-negative"),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { biography, rate } = formSchema.parse(await req.json());
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
        select: { id: true, specialistId: true },
      });

      // if (existing) {
      //   if (existing.specialistId) {
      //     await tx.specialist.deleteMany({
      //       where: { id: existing.specialistId },
      //     });
      //   }
      //   await tx.specialistApplication.deleteMany({
      //     where: { id: existing.id },
      //   });
      // }

      if (existing) {
        await tx.trainingVideoWatch.deleteMany({
          where: { applicationId: existing.id },
        });
        await tx.specialistApplication.delete({ where: { id: existing.id } });
      }

      const app = await tx.specialistApplication.create({
        data: {
          userId,
          biography,
          rate,
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
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
