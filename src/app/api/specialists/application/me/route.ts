import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const application = await prisma.specialistApplication.findFirst({
      where: { userId: session.user.id },
      select: { status: true, specialistId: true },
    });

    return NextResponse.json({
      status: application?.status || "none",
      specialistId: application?.specialistId || null,
    });
  } catch (error) {
    console.error("Error fetching user application:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
