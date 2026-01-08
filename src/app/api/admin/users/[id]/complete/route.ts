// src\app\api\admin\users\[id]\route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const id = url.pathname.split("/").slice(-2)[0];

    if (!id) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    // Check if admin
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true },
    });

    if (!currentUser?.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch complete user data
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        professionalApplication: {
          include: {
            professional: true,
            quizAttempts: true,
            videoWatch: true,
          },
        },
        appointments: {
          include: { professional: true, payment: true },
        },
        VideoSession: true,
        posts: {
          include: { author: true, replies: true },
        },
        replies: {
          include: { author: true, post: true },
        },
        ProfileVisit: {
          include: { user: true },
        },
        reviews: {
          include: { professional: true },
        },
        blocking: {
          include: { blocked: true },
        },
        blockedBy: {
          include: { blocker: true },
        },
        cart: {
          include: { items: { include: { merchandise: true } } },
        },
        orders: {
          include: { items: { include: { merchandise: true } }, payment: true },
        },
        trainingVideoWatches: {
          include: { video: true },
        },
        photos: true,
        sentMessages: {
          include: { recipientUser: true },
        },
        receivedMessages: {
          include: { senderUser: true },
        },
        conversations1: {
          include: { user2: true, messages: true },
        },
        conversations2: {
          include: { user1: true, messages: true },
        },
        reports: {
          include: { reportedUser: true, reportedProfessional: true },
        },
        reported: {
          include: { reporter: true },
        },
        securityLogs: true,
        surveyResponses: true,
        notesReceived: {
          include: { author: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Format response
    return NextResponse.json({
      // Basic info
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      status: user.status,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,

      // OAuth & Auth
      oauth: {
        googleId: user.googleId,
        appleId: user.appleId,
        facebookId: user.facebookId,
        primaryAuthMethod: user.primaryAuthMethod,
      },

      // Security
      security: {
        emailVerified: user.emailVerified,
        emailVerifiedAt: user.emailVerifiedAt,
        failedLoginAttempts: user.failedLoginAttempts,
        lockedUntil: user.lockedUntil,
        lastLoginAt: user.lastLoginAt,
        lastLoginIp: user.lastLoginIp,
        lastOnline: user.lastOnline,
      },

      // Profile
      profile: {
        profileImage: user.profileImage,
        location: user.location,
        biography: user.biography,
        relationshipStatus: user.relationshipStatus,
        orientation: user.orientation,
        height: user.height,
        ethnicity: user.ethnicity,
        zodiacSign: user.zodiacSign,
        favoriteColor: user.favoriteColor,
        favoriteMedia: user.favoriteMedia,
        petOwnership: user.petOwnership,
        heardFrom: user.heardFrom,
        heardFromOther: user.heardFromOther,
      },

      // Professional info
      professional: {
        application: user.professionalApplication
          ? {
              id: user.professionalApplication.id,
              status: user.professionalApplication.status,
              rate: user.professionalApplication.rate,
              venue: user.professionalApplication.venue,
              submittedAt: user.professionalApplication.submittedAt,
              videoWatchedAt: user.professionalApplication.videoWatchedAt,
              quizPassedAt: user.professionalApplication.quizPassedAt,
              professionalId: user.professionalApplication.professionalId,
              quizAttempts: user.professionalApplication.quizAttempts,
              videoWatch: user.professionalApplication.videoWatch,
            }
          : null,
      },

      // Activity
      activity: {
        appointments: user.appointments.length,
        videoSessions: user.VideoSession.length,
        postsCreated: user.posts.length,
        repliesCreated: user.replies.length,
        reviewsGiven: user.reviews.length,
        profileVisitsReceived: user.ProfileVisit.length,
      },

      // Content
      content: {
        photos: user.photos,
        posts: user.posts.map((p) => ({
          id: p.id,
          title: p.title,
          content: p.content,
          category: p.category,
          createdAt: p.createdAt,
          replyCount: p.replies.length,
        })),
        replies: user.replies.map((r) => ({
          id: r.id,
          content: r.content,
          postId: r.postId,
          createdAt: r.createdAt,
        })),
      },

      // Communications
      communications: {
        conversations: [
          ...user.conversations1.map((c) => ({
            id: c.id,
            otherUser: c.user2,
            messageCount: c.messages.length,
            createdAt: c.createdAt,
          })),
          ...user.conversations2.map((c) => ({
            id: c.id,
            otherUser: c.user1,
            messageCount: c.messages.length,
            createdAt: c.createdAt,
          })),
        ],
        messagesSent: user.sentMessages.length,
        messagesReceived: user.receivedMessages.length,
      },

      // Blocking
      blocking: {
        usersBlocked: user.blocking.map((b) => ({
          id: b.blocked.id,
          name: b.blocked.name,
          email: b.blocked.email,
          createdAt: b.createdAt,
        })),
        blockedByUsers: user.blockedBy.map((b) => ({
          id: b.blocker.id,
          name: b.blocker.name,
          email: b.blocker.email,
          createdAt: b.createdAt,
        })),
      },

      // Reports
      reports: {
        reportsAboutThisUser: user.reported.map((r) => ({
          id: r.id,
          reportedBy: r.reporter.name,
          reportedByEmail: r.reporter.email,
          reason: r.reason,
          details: r.details,
          status: r.status,
          createdAt: r.createdAt,
        })),
        reportsSubmittedByUser: user.reports.map((r) => ({
          id: r.id,
          reportedUser: r.reportedUser?.name,
          reportedProfessional: r.reportedProfessional?.name,
          reason: r.reason,
          details: r.details,
          status: r.status,
          createdAt: r.createdAt,
        })),
      },

      // Shopping
      shopping: {
        cart: user.cart
          ? {
              id: user.cart.id,
              items: user.cart.items.map((i) => ({
                merchandiseId: i.merchandise.id,
                name: i.merchandise.name,
                price: i.merchandise.price,
                quantity: i.quantity,
              })),
              totalItems: user.cart.items.reduce(
                (sum, item) => sum + item.quantity,
                0
              ),
              totalValue: user.cart.items.reduce(
                (sum, item) => sum + item.merchandise.price * item.quantity,
                0
              ),
            }
          : null,
        orders: user.orders.map((o) => ({
          id: o.id,
          totalAmount: o.totalAmount,
          status: o.status,
          items: o.items.map((i) => ({
            name: i.merchandise.name,
            quantity: i.quantity,
            price: i.price,
          })),
          paymentStatus: o.payment?.status,
          createdAt: o.createdAt,
        })),
      },

      // Training
      training: {
        videosWatched: user.trainingVideoWatches.map((w) => ({
          id: w.id,
          videoName: w.video.name,
          watchedSeconds: w.watchedSec,
          isCompleted: w.isCompleted,
          lastWatchedAt: w.lastWatchedAt,
        })),
      },

      // Security Logs
      securityLogs: user.securityLogs.map((log) => ({
        id: log.id,
        eventType: log.eventType,
        ipAddress: log.ipAddress,
        details: log.details,
        timestamp: log.timestamp,
      })),

      // Survey
      survey:
        user.surveyResponses.length > 0
          ? {
              rating: user.surveyResponses[0].rating,
              feedback: user.surveyResponses[0].feedback,
              respondedAt: user.surveyResponses[0].createdAt,
            }
          : null,

      // Admin Notes
      adminNotes: user.notesReceived.map((note) => ({
        id: note.id,
        author: note.author.name,
        content: note.content,
        createdAt: note.createdAt,
      })),
    });
  } catch (error) {
    console.error("GET /api/admin/users/[id]/complete error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
