// src/lib/onboarding.ts
import prisma from "@/lib/prisma";

export async function getProOnboardingVideo() {
  return prisma.trainingVideo.findFirst({
    where: { isProOnboarding: true, isActive: true },
    select: { id: true, name: true, url: true, durationSec: true },
  });
}

export async function getOrCreateProVideoWatch({
  userId,
  videoId,
  applicationId,
}: {
  userId: string;
  videoId: string;
  applicationId: string;
}) {
  return prisma.trainingVideoWatch.upsert({
    where: { applicationId },
    update: {},
    create: {
      userId,
      videoId,
      applicationId,
      watchedSec: 0,
      isCompleted: false,
    },
  });
}
