// app/api/specialists/[id]/user/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> } // Fixed: params is now a Promise
) {
  const params = await context.params; // Resolve the Promise
  const id = params.id; // Access the id

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const app = await prisma.specialistApplication.findFirst({
      where: { specialistId: id, status: "APPROVED" },
      select: { userId: true },
    });
    if (!app) {
      return NextResponse.json(
        { error: "Specialist not found" },
        { status: 404 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: app.userId },
      select: { id: true, name: true },
    });

    return NextResponse.json({ userId: user?.id, name: user?.name });
  } catch (error) {
    console.error("Fetch specialist user error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
