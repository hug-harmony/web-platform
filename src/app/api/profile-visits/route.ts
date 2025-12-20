// src/app/api/profile-visits/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { createProfileVisitNotification } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const { professionalId, visitedUserId } = await req.json();
    if (!professionalId && !visitedUserId) {
      return NextResponse.json(
        { error: "Professional ID or User ID is required" },
        { status: 400 }
      );
    }
    if (professionalId && visitedUserId) {
      return NextResponse.json(
        { error: "Provide only one of Professional ID or User ID" },
        { status: 400 }
      );
    }

    // Don't record or notify if user is viewing their own profile
    if (
      session.user.id === visitedUserId ||
      session.user.id === professionalId
    ) {
      return NextResponse.json(
        { message: "Self-visit not recorded" },
        { status: 200 }
      );
    }

    const profileVisit = await prisma.profileVisit.create({
      data: {
        userId: session.user.id,
        professionalId,
        visitedUserId,
      },
      include: {
        user: {
          select: { id: true, name: true, profileImage: true },
        },
      },
    });

    // Get the ID of the user whose profile was visited (for notification)
    const notifyUserId = visitedUserId || professionalId;
    const visitorName = profileVisit.user.name || "Someone";

    // Create notification using AWS DynamoDB (with rate limiting built-in)
    if (notifyUserId) {
      try {
        const notification = await createProfileVisitNotification(
          session.user.id,
          visitorName,
          notifyUserId
        );

        if (notification) {
          console.log("Profile visit notification created successfully");
        } else {
          console.log("Profile visit notification skipped (rate limited)");
        }
      } catch (notifError) {
        console.error("Notification creation error:", notifError);
        // Don't fail the request if notification fails
      }
    }

    return NextResponse.json(
      {
        id: profileVisit.id,
        userName: profileVisit.user.name || "User",
        userAvatar: profileVisit.user.profileImage || null,
        professionalId: profileVisit.professionalId,
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
        OR: [{ professional: { id: userId } }, { visitedUser: { id: userId } }],
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
        professional: {
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
          id: visit.professionalId || visit.visitedUserId,
          name:
            visit.professional?.name || visit.visitedUser?.name || "Unknown",
          type: visit.professionalId ? "professional" : "user",
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
