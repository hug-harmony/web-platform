
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

const updateProfessionalSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  image: z.string().url().nullable().optional(),
  rate: z.number().min(0).optional(),
  biography: z
    .string()
    .max(1000, "Biography must be 1000 characters or less")
    .nullish()
    .transform((val) => val || null),
  location: z
    .string()
    .max(100, "Location must be 100 characters or less")
    .nullish()
    .transform((val) => val || null),
  venue: z.enum(["host", "visit", "both"]).optional(),
  companyCutPercentage: z.number().min(0).max(100).optional(),
  paymentAcceptanceMethods: z.array(z.string()).optional(),
});

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const id = url.pathname.split("/").pop();

    if (!id) {
      return NextResponse.json(
        { error: "Invalid professional ID" },
        { status: 400 }
      );
    }

    // Check if admin
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true },
    });

    if (!currentUser?.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const professional = await prisma.professional.findUnique({
      where: { id },
      include: {
        applications: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
                profileImage: true,
                status: true,
                createdAt: true,
                lastOnline: true,
                emailVerified: true,
              },
            },
            quizAttempts: true,
            videoWatch: {
              include: {
                video: true,
              },
            },
          },
        },
        appointments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                profileImage: true,
              },
            },
            payment: true,
            confirmation: true,
          },
          orderBy: { startTime: "desc" },
          take: 50,
        },
        VideoSession: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        availability: true,
        profileVisits: {
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
          take: 50,
        },
        reviews: {
          include: {
            reviewer: {
              select: {
                id: true,
                name: true,
                profileImage: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        discounts: true,
        reported: {
          include: {
            reporter: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        notesReceived: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        earnings: {
          include: {
            appointment: true,
            cycle: true,
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        feeCharges: {
          include: {
            cycle: true,
          },
          orderBy: { createdAt: "desc" },
        },
        appointmentConfirmations: {
          include: {
            appointment: true,
            client: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        Proposal: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            conversation: true,
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    });

    if (!professional) {
      return NextResponse.json(
        { error: "Professional not found" },
        { status: 404 }
      );
    }

    // Calculate stats
    const completedAppointments = professional.appointments.filter(
      (a) => a.status === "completed"
    ).length;
    const upcomingAppointments = professional.appointments.filter(
      (a) => a.status === "upcoming"
    ).length;
    const cancelledAppointments = professional.appointments.filter(
      (a) => a.status === "cancelled"
    ).length;

    const totalEarnings = professional.earnings.reduce(
      (sum, e) => sum + e.grossAmount,
      0
    );
    const totalPlatformFees = professional.earnings.reduce(
      (sum, e) => sum + e.platformFeeAmount,
      0
    );

    const averageRating =
      professional.reviews.length > 0
        ? professional.reviews.reduce((sum, r) => sum + r.rating, 0) /
        professional.reviews.length
        : null;

    // Get linked user info
    const linkedApplication = professional.applications[0];
    const linkedUser = linkedApplication?.user;

    return NextResponse.json({
      // Basic Info
      id: professional.id,
      name: professional.name,
      image: professional.image,
      rating: professional.rating,
      reviewCount: professional.reviewCount,
      rate: professional.rate,
      biography: professional.biography,
      location: professional.location,
      venue: professional.venue,
      companyCutPercentage: professional.companyCutPercentage,
      createdAt: professional.createdAt,

      // Payment Info
      payment: {
        stripeCustomerId: professional.stripeCustomerId,
        hasValidPaymentMethod: professional.hasValidPaymentMethod,
        cardLast4: professional.cardLast4,
        cardBrand: professional.cardBrand,
        cardExpiryMonth: professional.cardExpiryMonth,
        cardExpiryYear: professional.cardExpiryYear,
        paymentMethodAddedAt: professional.paymentMethodAddedAt,
        paymentBlockedAt: professional.paymentBlockedAt,
        paymentBlockReason: professional.paymentBlockReason,
        paymentAcceptanceMethods: professional.paymentAcceptanceMethods,
      },

      // Linked User
      linkedUser: linkedUser
        ? {
          id: linkedUser.id,
          email: linkedUser.email,
          name: linkedUser.name,
          firstName: linkedUser.firstName,
          lastName: linkedUser.lastName,
          phoneNumber: linkedUser.phoneNumber,
          profileImage: linkedUser.profileImage,
          status: linkedUser.status,
          createdAt: linkedUser.createdAt,
          lastOnline: linkedUser.lastOnline,
          emailVerified: linkedUser.emailVerified,
        }
        : null,

      // Application Info
      application: linkedApplication
        ? {
          id: linkedApplication.id,
          status: linkedApplication.status,
          rate: linkedApplication.rate,
          venue: linkedApplication.venue,
          submittedAt: linkedApplication.submittedAt,
          videoWatchedAt: linkedApplication.videoWatchedAt,
          quizPassedAt: linkedApplication.quizPassedAt,
          createdAt: linkedApplication.createdAt,
          quizAttempts: linkedApplication.quizAttempts.map((qa) => ({
            id: qa.id,
            score: qa.score,
            passed: qa.passed,
            attemptedAt: qa.attemptedAt,
            nextEligibleAt: qa.nextEligibleAt,
          })),
          videoWatch: linkedApplication.videoWatch
            ? {
              id: linkedApplication.videoWatch.id,
              videoName: linkedApplication.videoWatch.video.name,
              watchedSec: linkedApplication.videoWatch.watchedSec,
              isCompleted: linkedApplication.videoWatch.isCompleted,
              lastWatchedAt: linkedApplication.videoWatch.lastWatchedAt,
            }
            : null,
        }
        : null,

      // Stats
      stats: {
        totalAppointments: professional.appointments.length,
        completedAppointments,
        upcomingAppointments,
        cancelledAppointments,
        totalVideoSessions: professional.VideoSession.length,
        totalProfileVisits: professional.profileVisits.length,
        totalReviews: professional.reviews.length,
        averageRating,
        totalEarnings,
        totalPlatformFees,
        netEarnings: totalEarnings - totalPlatformFees,
        totalProposals: professional.Proposal.length,
        pendingProposals: professional.Proposal.filter(
          (p) => p.status === "pending"
        ).length,
        reportsReceived: professional.reported.length,
      },

      // Availability
      availability: professional.availability.map((a) => ({
        id: a.id,
        dayOfWeek: a.dayOfWeek,
        slots: a.slots,
        breakDuration: a.breakDuration,
      })),

      // Appointments (recent 50)
      appointments: professional.appointments.map((apt) => ({
        id: apt.id,
        clientId: apt.userId,
        clientName: apt.user?.name || "Unknown",
        clientEmail: apt.user?.email,
        startTime: apt.startTime,
        endTime: apt.endTime,
        status: apt.status,
        disputeStatus: apt.disputeStatus,
        disputeReason: apt.disputeReason,
        rate: apt.rate,
        adjustedRate: apt.adjustedRate,
        venue: apt.venue,
        paymentStatus: apt.payment?.status || "none",
        paymentAmount: apt.payment?.amount,
        confirmation: apt.confirmation
          ? {
            clientConfirmed: apt.confirmation.clientConfirmed,
            professionalConfirmed: apt.confirmation.professionalConfirmed,
            finalStatus: apt.confirmation.finalStatus,
            isDisputed: apt.confirmation.isDisputed,
          }
          : null,
        createdAt: apt.createdAt,
      })),

      // Video Sessions (recent 50)
      videoSessions: professional.VideoSession.map((vs) => ({
        id: vs.id,
        meetingId: vs.meetingId,
        clientId: vs.userId,
        clientName: vs.user?.name || "Unknown",
        scheduledStart: vs.scheduledStart,
        actualStart: vs.actualStart,
        actualEnd: vs.actualEnd,
        duration: vs.duration,
        status: vs.status,
        endReason: vs.endReason,
        createdAt: vs.createdAt,
      })),

      // Reviews
      reviews: professional.reviews.map((r) => ({
        id: r.id,
        reviewerId: r.reviewerId,
        reviewerName: r.reviewer?.name || "Unknown",
        reviewerImage: r.reviewer?.profileImage,
        rating: r.rating,
        feedback: r.feedback,
        createdAt: r.createdAt,
      })),

      // Discounts
      discounts: professional.discounts.map((d) => ({
        id: d.id,
        name: d.name,
        rate: d.rate,
        discount: d.discount,
        createdAt: d.createdAt,
      })),

      // Earnings (recent 50)
      earnings: professional.earnings.map((e) => ({
        id: e.id,
        appointmentId: e.appointmentId,
        cycleId: e.cycleId,
        cycleStartDate: e.cycle?.startDate,
        cycleEndDate: e.cycle?.endDate,
        grossAmount: e.grossAmount,
        platformFeePercent: e.platformFeePercent,
        platformFeeAmount: e.platformFeeAmount,
        sessionDurationMinutes: e.sessionDurationMinutes,
        hourlyRate: e.hourlyRate,
        status: e.status,
        createdAt: e.createdAt,
      })),

      // Fee Charges
      feeCharges: professional.feeCharges.map((fc) => ({
        id: fc.id,
        cycleId: fc.cycleId,
        cycleStartDate: fc.cycle?.startDate,
        cycleEndDate: fc.cycle?.endDate,
        totalGrossEarnings: fc.totalGrossEarnings,
        platformFeePercent: fc.platformFeePercent,
        amountToCharge: fc.amountToCharge,
        earningsCount: fc.earningsCount,
        status: fc.status,
        attemptCount: fc.attemptCount,
        lastAttemptAt: fc.lastAttemptAt,
        failureCode: fc.failureCode,
        failureMessage: fc.failureMessage,
        chargedAt: fc.chargedAt,
        chargedAmount: fc.chargedAmount,
        waivedAt: fc.waivedAt,
        waivedReason: fc.waivedReason,
        createdAt: fc.createdAt,
      })),

      // Profile Visits (recent 50)
      profileVisits: professional.profileVisits.map((pv) => ({
        id: pv.id,
        visitorId: pv.userId,
        visitorName: pv.user?.name || "Unknown",
        visitorImage: pv.user?.profileImage,
        createdAt: pv.createdAt,
      })),

      // Reports
      reports: professional.reported.map((r) => ({
        id: r.id,
        reporterId: r.reporterId,
        reporterName: r.reporter?.name || "Unknown",
        reporterEmail: r.reporter?.email,
        reason: r.reason,
        details: r.details,
        status: r.status,
        createdAt: r.createdAt,
      })),

      // Proposals (recent 50)
      proposals: professional.Proposal.map((p) => ({
        id: p.id,
        userId: p.userId,
        userName: p.user?.name || "Unknown",
        userEmail: p.user?.email,
        conversationId: p.conversationId,
        startTime: p.startTime,
        endTime: p.endTime,
        venue: p.venue,
        status: p.status,
        initiator: p.initiator,
        createdAt: p.createdAt,
      })),

      // Admin Notes
      adminNotes: professional.notesReceived.map((n) => ({
        id: n.id,
        authorId: n.authorId,
        authorName: n.author?.name || "Unknown",
        content: n.content,
        createdAt: n.createdAt,
      })),
    });
  } catch (error) {
    console.error("GET /api/admin/professionals/[id] error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = new URL(req.url).pathname.split("/").pop();
    if (!id) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true },
    });

    if (!currentUser?.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const validatedData = updateProfessionalSchema.parse(body);

    const professional = await prisma.professional.findUnique({
      where: { id },
      include: {
        applications: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!professional) {
      return NextResponse.json(
        { error: "Professional not found" },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: Prisma.ProfessionalUpdateInput = {};

    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.image !== undefined)
      updateData.image = validatedData.image;
    if (validatedData.rate !== undefined) updateData.rate = validatedData.rate;
    if (validatedData.biography !== undefined)
      updateData.biography = validatedData.biography;
    if (validatedData.location !== undefined)
      updateData.location = validatedData.location;
    if (validatedData.venue !== undefined)
      updateData.venue = validatedData.venue;
    if (validatedData.companyCutPercentage !== undefined)
      updateData.companyCutPercentage = validatedData.companyCutPercentage;
    if (validatedData.paymentAcceptanceMethods !== undefined)
      updateData.paymentAcceptanceMethods =
        validatedData.paymentAcceptanceMethods;

    const updatedProfessional = await prisma.professional.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        image: true,
        rate: true,
        biography: true,
        location: true,
        venue: true,
        companyCutPercentage: true,
        rating: true,
        reviewCount: true,
        createdAt: true,
        paymentAcceptanceMethods: true,
      },
    });

    // Sync relevant fields back to linked user if exists
    const linkedUser = professional.applications[0]?.user;
    if (linkedUser) {
      const userUpdateData: Prisma.UserUpdateInput = {};
      if (validatedData.name !== undefined)
        userUpdateData.name = validatedData.name;
      if (validatedData.image !== undefined)
        userUpdateData.profileImage = validatedData.image;
      if (validatedData.biography !== undefined)
        userUpdateData.biography = validatedData.biography;
      if (validatedData.location !== undefined)
        userUpdateData.location = validatedData.location;

      if (Object.keys(userUpdateData).length > 0) {
        await prisma.user.update({
          where: { id: linkedUser.id },
          data: userUpdateData,
        });
      }
    }

    return NextResponse.json(updatedProfessional);
  } catch (error: unknown) {
    console.error("PATCH /api/admin/professionals/[id] error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: (error as Error).message || "Update failed" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = new URL(req.url).pathname.split("/").pop();
    if (!id) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true },
    });

    if (!currentUser?.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Update the linked application status to SUSPENDED instead of deleting
    const professional = await prisma.professional.findUnique({
      where: { id },
      include: {
        applications: true,
      },
    });

    if (!professional) {
      return NextResponse.json(
        { error: "Professional not found" },
        { status: 404 }
      );
    }

    // Update application status to SUSPENDED
    if (professional.applications[0]) {
      await prisma.professionalApplication.update({
        where: { id: professional.applications[0].id },
        data: { status: "SUSPENDED" },
      });
    }

    return NextResponse.json({
      message: "Professional suspended",
      professional: { id: professional.id },
    });
  } catch (error) {
    console.error("DELETE /api/admin/professionals/[id] error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
