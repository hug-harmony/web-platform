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
    // Verify user is a specialist via Prisma
    const specialistApp = await prisma.specialistApplication.findFirst({
      where: { userId },
    });
    if (specialistApp?.status !== "approved") {
      console.error("Forbidden: User is not a specialist", { userId });
      return NextResponse.json(
        { error: "Forbidden: Not a specialist" },
        { status: 403 }
      );
    }

    const proposals = await prisma.proposal.findMany({
      where: { specialistId: userId, NOT: { status: "pending" } },
      include: {
        user: { select: { name: true } },
        specialist: { select: { name: true, rate: true } },
      },
    });
    console.log("Client proposals fetched:", proposals);
    return NextResponse.json(proposals, { status: 200 });
  } catch (error) {
    console.error("Error fetching client proposals:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
