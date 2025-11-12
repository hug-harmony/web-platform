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

    const app = await prisma.professionalApplication.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!app) {
      return NextResponse.json({ eligible: true });
    }

    const lastFail = await prisma.proQuizAttempt.findFirst({
      where: { applicationId: app.id, passed: false },
      orderBy: { attemptedAt: "desc" },
      select: { nextEligibleAt: true },
    });

    if (!lastFail?.nextEligibleAt) {
      return NextResponse.json({ eligible: true });
    }

    const now = Date.now();
    const next = lastFail.nextEligibleAt.getTime();

    return NextResponse.json({
      eligible: now >= next,
      nextEligibleAt: lastFail.nextEligibleAt,
      secondsLeft: Math.max(0, Math.floor((next - now) / 1000)),
    });
  } catch (error) {
    console.error("Error checking quiz cooldown:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
