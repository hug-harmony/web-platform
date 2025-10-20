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

    const { specialistId, visitedUserId } = await req.json();
    if (!specialistId && !visitedUserId) {
      return NextResponse.json(
        { error: "Specialist ID or User ID is required" },
        { status: 400 }
      );
    }
    if (specialistId && visitedUserId) {
      return NextResponse.json(
        { error: "Provide only one of Specialist ID or User ID" },
        { status: 400 }
      );
    }

    const profileVisit = await prisma.profileVisit.create({
      data: {
        userId: session.user.id,
        specialistId,
        visitedUserId,
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
        visitedUserId: profileVisit.visitedUserId,
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
        OR: [{ specialist: { id: userId } }, { visitedUser: { id: userId } }],
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
        specialist: {
          select: {
            id: true,
            name: true,
          },
        },
        visitedUser: {
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
        visited: {
          id: visit.specialistId || visit.visitedUserId,
          name: visit.specialist?.name || visit.visitedUser?.name || "Unknown",
          type: visit.specialistId ? "specialist" : "user",
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
