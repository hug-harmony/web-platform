import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const { specialistId } = await req.json();

    if (!specialistId) {
      return NextResponse.json(
        { error: "Specialist ID is required" },
        { status: 400 }
      );
    }

    const profileVisit = await prisma.profileVisit.create({
      data: {
        userId: session.user.id,
        specialistId,
      },
      include: {
        user: {
          select: { name: true, profileImage: true },
        },
      },
    });

    return NextResponse.json(
      {
        id: profileVisit.id,
        userName: profileVisit.user.name || "User",
        userAvatar: profileVisit.user.profileImage || null,
        specialistId: profileVisit.specialistId,
        createdAt: profileVisit.createdAt,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
