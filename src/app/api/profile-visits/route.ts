// src\app\api\profile-visits\route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

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

    // Create notification in Supabase
    if (supabase && notifyUserId) {
      try {
        // Rate limit: Check if a notification was already sent in the last hour for this visitor
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

        const { data: existingNotif } = await supabase
          .from("notifications")
          .select("id")
          .eq("userid", notifyUserId) // lowercase
          .eq("type", "profile_visit")
          .eq("relatedid", session.user.id) // lowercase
          .gte("timestamp", oneHourAgo)
          .limit(1);

        // Only create notification if none exists in the last hour
        if (!existingNotif || existingNotif.length === 0) {
          const { error: notificationError } = await supabase
            .from("notifications")
            .insert({
              userid: notifyUserId, // lowercase
              type: "profile_visit",
              content: `${visitorName} viewed your profile`,
              unread: true,
              relatedid: session.user.id, // lowercase
            });

          if (notificationError) {
            console.error("Failed to create notification:", notificationError);
          } else {
            console.log("Profile visit notification created successfully");
          }
        }
      } catch (notifError) {
        console.error("Notification creation error:", notifError);
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
