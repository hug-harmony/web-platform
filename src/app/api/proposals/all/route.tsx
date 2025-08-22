import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    console.error("Unauthorized: No session or user ID found");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = session.user.id;
    // Check specialist status via Prisma
    const specialistApp = await prisma.specialistApplication.findFirst({
      where: { userId },
    });
    const isSpecialist = specialistApp?.status === "approved";

    if (isSpecialist) {
      const [received, sent] = await Promise.all([
        prisma.proposal.findMany({
          where: { specialistId: userId, NOT: { status: "pending" } },
          include: {
            user: { select: { name: true } },
            specialist: { select: { name: true, rate: true } },
          },
        }),
        prisma.proposal.findMany({
          where: { userId, NOT: { status: "pending" } },
          include: {
            user: { select: { name: true } },
            specialist: { select: { name: true, rate: true } },
          },
        }),
      ]);
      console.log("Proposals fetched for specialist:", { received, sent });
      return NextResponse.json({ received, sent }, { status: 200 });
    } else {
      const proposals = await prisma.proposal.findMany({
        where: { userId, NOT: { status: "pending" } },
        include: {
          user: { select: { name: true } },
          specialist: { select: { name: true, rate: true } },
        },
      });
      console.log("Proposals fetched for user:", proposals);
      return NextResponse.json(proposals, { status: 200 });
    }
  } catch (error) {
    console.error("Error fetching proposals:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
