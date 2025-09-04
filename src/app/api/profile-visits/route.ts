import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

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

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ visits: [] }, { status: 200 });
    }

    const userId = session.user.id;
    const application = await prisma.specialistApplication.findUnique({
      where: { userId },
      select: { status: true, specialistId: true },
    });

    if (
      !application ||
      application.status !== "approved" ||
      !application.specialistId
    ) {
      return NextResponse.json({ visits: [] }, { status: 200 });
    }

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter") || "7d";

    const dateFilter: { gte?: Date } = {};
    if (filter === "today") {
      dateFilter.gte = new Date(new Date().setHours(0, 0, 0, 0));
    } else if (filter === "7d") {
      dateFilter.gte = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    } else if (filter === "30d") {
      dateFilter.gte = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    const visits = await prisma.profileVisit.findMany({
      where: {
        specialistId: application.specialistId,
        createdAt: dateFilter,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profileImage: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      visits: visits.map((visit) => ({
        id: visit.id,
        user: {
          id: visit.user.id,
          name: visit.user.name || "User",
          avatar: visit.user.profileImage,
        },
        createdAt: visit.createdAt,
      })),
    });
  } catch (error) {
    console.error("GET Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
