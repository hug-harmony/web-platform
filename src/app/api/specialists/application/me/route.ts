/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const application = await prisma.professionalApplication.findFirst({
      where: { userId: session.user.id },
      select: { status: true, professionalId: true },
    });

    return NextResponse.json({
      status: application?.status || "none",
      professionalId: application?.professionalId || null,
    });
  } catch (error: unknown) {
    console.error("Error fetching user application:", error);
    return NextResponse.json(
      { error: "Internal server error: Failed to fetch application" },
      { status: 500 }
    );
  }
}
