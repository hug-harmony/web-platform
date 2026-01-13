// src/app/api/admin/operations/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  OperationItem,
  OperationsStats,
  OperationType,
  Priority,
  Feedback,
  Report,
  Dispute,
} from "@/types/operations";

// GET - Fetch all operations (feedback, reports, disputes) with filters and stats
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    // Parse query params
    const type = searchParams.get("type") || "all";
    const status = searchParams.get("status") || "all";
    const priority = searchParams.get("priority") || "all";
    const search = searchParams.get("search") || "";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    // Date range filter
    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }

    // Fetch all data types in parallel
    const [feedbackData, reportsData, disputesData] = await Promise.all([
      // FEEDBACK
      type === "all" || type === "feedback"
        ? prisma.feedback.findMany({
          where: {
            ...(status !== "all" && { status }),
            ...(priority !== "all" && { priority }),
            ...(Object.keys(dateFilter).length > 0 && {
              createdAt: dateFilter,
            }),
            ...(search && {
              OR: [
                {
                  subject: { contains: search, mode: "insensitive" as const },
                },
                {
                  message: { contains: search, mode: "insensitive" as const },
                },
                {
                  user: {
                    email: { contains: search, mode: "insensitive" as const },
                  },
                },
                {
                  user: {
                    firstName: {
                      contains: search,
                      mode: "insensitive" as const,
                    },
                  },
                },
                {
                  user: {
                    lastName: {
                      contains: search,
                      mode: "insensitive" as const,
                    },
                  },
                },
              ],
            }),
          },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                profileImage: true,
                phoneNumber: true,
                createdAt: true,
                lastOnline: true,
              },
            },
            adminUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                profileImage: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        })
        : [],

      // REPORTS
      type === "all" || type === "report"
        ? prisma.report.findMany({
          where: {
            ...(status !== "all" && { status }),
            ...(priority !== "all" && { priority }),
            ...(Object.keys(dateFilter).length > 0 && {
              createdAt: dateFilter,
            }),
            ...(search && {
              OR: [
                {
                  reason: { contains: search, mode: "insensitive" as const },
                },
                {
                  details: { contains: search, mode: "insensitive" as const },
                },
                {
                  reporter: {
                    email: { contains: search, mode: "insensitive" as const },
                  },
                },
                {
                  reporter: {
                    firstName: {
                      contains: search,
                      mode: "insensitive" as const,
                    },
                  },
                },
                {
                  reportedUser: {
                    email: { contains: search, mode: "insensitive" as const },
                  },
                },
                {
                  reportedProfessional: {
                    name: { contains: search, mode: "insensitive" as const },
                  },
                },
              ],
            }),
          },
          select: {
            id: true,
            reporterId: true,
            reportedUserId: true,
            reportedProfessionalId: true,
            reason: true,
            details: true,
            status: true,
            priority: true,
            adminResponse: true,
            adminRespondedBy: true,
            adminRespondedAt: true,
            createdAt: true,
            reporter: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                profileImage: true,
                phoneNumber: true,
                createdAt: true,
                lastOnline: true,
              },
            },
            reportedUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                profileImage: true,
                phoneNumber: true,
                status: true,
                createdAt: true,
              },
            },
            reportedProfessional: {
              select: {
                id: true,
                name: true,
                image: true,
                rating: true,
                reviewCount: true,
                location: true,
                applications: {
                  select: {
                    userId: true,
                    status: true,
                    user: {
                      select: {
                        id: true,
                        email: true,
                        phoneNumber: true,
                      },
                    },
                  },
                  take: 1,
                },
              },
            },
            adminUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                profileImage: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        })
        : [],

      // DISPUTES (from appointments)
      type === "all" || type === "dispute"
        ? prisma.appointment.findMany({
          where: {
            disputeStatus: { not: "none" },
            ...(status !== "all" && { disputeStatus: status }),
            ...(Object.keys(dateFilter).length > 0 && {
              createdAt: dateFilter,
            }),
            ...(search && {
              OR: [
                {
                  disputeReason: {
                    contains: search,
                    mode: "insensitive" as const,
                  },
                },
                {
                  adminNotes: {
                    contains: search,
                    mode: "insensitive" as const,
                  },
                },
                {
                  user: {
                    email: { contains: search, mode: "insensitive" as const },
                  },
                },
                {
                  user: {
                    firstName: {
                      contains: search,
                      mode: "insensitive" as const,
                    },
                  },
                },
                {
                  professional: {
                    name: { contains: search, mode: "insensitive" as const },
                  },
                },
              ],
            }),
          },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                profileImage: true,
                phoneNumber: true,
                createdAt: true,
                lastOnline: true,
              },
            },
            professional: {
              select: {
                id: true,
                name: true,
                image: true,
                rating: true,
                reviewCount: true,
                location: true,
                applications: {
                  select: {
                    userId: true,
                    status: true,
                    user: {
                      select: {
                        id: true,
                        email: true,
                        phoneNumber: true,
                      },
                    },
                  },
                  take: 1,
                },
              },
            },
            payment: {
              select: {
                id: true,
                amount: true,
                status: true,
                stripeId: true,
              },
            },
            confirmation: {
              select: {
                id: true,
                clientConfirmed: true,
                professionalConfirmed: true,
                finalStatus: true,
                isDisputed: true,
                disputeReason: true,
                disputeCreatedAt: true,
                disputeResolvedAt: true,
                disputeResolution: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        })
        : [],
    ]);

    // Transform to unified OperationItem format
    const items: OperationItem[] = [];

    // Transform feedback
    for (const fb of feedbackData) {
      items.push({
        id: fb.id,
        type: "feedback" as OperationType,
        status: fb.status,
        priority: fb.priority as Priority,
        subject: fb.subject,
        description: fb.message,
        category: fb.category as OperationItem["category"],
        createdAt: fb.createdAt,
        updatedAt: fb.updatedAt,
        submittedBy: {
          id: fb.user.id,
          firstName: fb.user.firstName,
          lastName: fb.user.lastName,
          email: fb.user.email,
          profileImage: fb.user.profileImage,
        },
        targetUser: null,
        targetProfessional: null,
        adminResponse: fb.adminResponse,
        adminRespondedBy: fb.adminUser
          ? {
            id: fb.adminUser.id,
            firstName: fb.adminUser.firstName,
            lastName: fb.adminUser.lastName,
            email: fb.adminUser.email,
            profileImage: fb.adminUser.profileImage,
          }
          : null,
        adminRespondedAt: fb.adminRespondedAt,
        originalData: fb as unknown as Feedback,
      });
    }

    // Transform reports
    for (const report of reportsData) {
      items.push({
        id: report.id,
        type: "report" as OperationType,
        status: report.status,
        priority: (report.priority || "normal") as Priority,
        subject: report.reason,
        description: report.details,
        createdAt: report.createdAt,
        updatedAt: report.createdAt,
        submittedBy: {
          id: report.reporter.id,
          firstName: report.reporter.firstName,
          lastName: report.reporter.lastName,
          email: report.reporter.email,
          profileImage: report.reporter.profileImage,
        },
        targetUser: report.reportedUser
          ? {
            id: report.reportedUser.id,
            firstName: report.reportedUser.firstName,
            lastName: report.reportedUser.lastName,
            email: report.reportedUser.email,
            profileImage: report.reportedUser.profileImage,
          }
          : null,
        targetProfessional: report.reportedProfessional
          ? {
            id: report.reportedProfessional.id,
            name: report.reportedProfessional.name,
            image: report.reportedProfessional.image,
            rating: report.reportedProfessional.rating,
            reviewCount: report.reportedProfessional.reviewCount,
            location: report.reportedProfessional.location,
            userId: report.reportedProfessional.applications?.[0]?.user?.id,
            userEmail:
              report.reportedProfessional.applications?.[0]?.user?.email,
          }
          : null,
        adminResponse: report.adminResponse,
        adminRespondedBy: report.adminUser
          ? {
            id: report.adminUser.id,
            firstName: report.adminUser.firstName,
            lastName: report.adminUser.lastName,
            email: report.adminUser.email,
            profileImage: report.adminUser.profileImage,
          }
          : null,
        adminRespondedAt: report.adminRespondedAt,
        originalData: report as unknown as Report,
      });
    }

    // Transform disputes
    for (const dispute of disputesData) {
      items.push({
        id: dispute.id,
        type: "dispute" as OperationType,
        status: dispute.disputeStatus,
        priority: "high" as Priority,
        subject: `Dispute: ${dispute.disputeReason || "Appointment dispute"}`,
        description: dispute.disputeReason,
        createdAt: dispute.createdAt,
        updatedAt: dispute.createdAt,
        submittedBy: dispute.user
          ? {
            id: dispute.user.id,
            firstName: dispute.user.firstName,
            lastName: dispute.user.lastName,
            email: dispute.user.email,
            profileImage: dispute.user.profileImage,
          }
          : null,
        targetUser: null,
        targetProfessional: dispute.professional
          ? {
            id: dispute.professional.id,
            name: dispute.professional.name,
            image: dispute.professional.image,
            rating: dispute.professional.rating,
            reviewCount: dispute.professional.reviewCount,
            location: dispute.professional.location,
            userId: dispute.professional.applications?.[0]?.user?.id,
            userEmail: dispute.professional.applications?.[0]?.user?.email,
          }
          : null,
        adminResponse: dispute.adminNotes,
        adminRespondedBy: null,
        adminRespondedAt: null,
        appointmentDetails: {
          startTime: dispute.startTime,
          endTime: dispute.endTime,
          status: dispute.status,
          payment: dispute.payment,
          confirmation: dispute.confirmation,
        },
        originalData: dispute as unknown as Dispute,
      });
    }

    // Sort all items by createdAt descending
    items.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Pagination
    const total = items.length;
    const paginatedItems = items.slice(skip, skip + limit);

    // Calculate stats using the already fetched data (avoid groupBy)
    const stats = calculateStatsFromData(
      feedbackData,
      reportsData,
      disputesData
    );

    return NextResponse.json({
      items: paginatedItems,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      stats,
    });
  } catch (error) {
    console.error("Fetch operations error:", error);
    return NextResponse.json(
      { error: "Failed to fetch operations" },
      { status: 500 }
    );
  }
}

// Calculate stats from already fetched data (no additional DB queries)
function calculateStatsFromData(
  feedbackData: Array<{ status: string; priority: string; createdAt: Date }>,
  reportsData: Array<{
    status: string;
    priority: string | null;
    createdAt: Date;
  }>,
  disputesData: Array<{ disputeStatus: string; createdAt: Date }>
): OperationsStats {
  // Initialize counters
  const byStatus = {
    pending: 0,
    in_progress: 0,
    resolved: 0,
    closed: 0,
  };

  const byPriority = {
    low: 0,
    normal: 0,
    high: 0,
    urgent: 0,
  };

  const dateMap = new Map<
    string,
    { feedback: number; report: number; dispute: number }
  >();

  // Process feedback
  for (const fb of feedbackData) {
    // By status
    if (fb.status in byStatus) {
      byStatus[fb.status as keyof typeof byStatus]++;
    }

    // By priority
    if (fb.priority in byPriority) {
      byPriority[fb.priority as keyof typeof byPriority]++;
    }

    // By date
    const dateStr = new Date(fb.createdAt).toISOString().split("T")[0];
    const existing = dateMap.get(dateStr) || {
      feedback: 0,
      report: 0,
      dispute: 0,
    };
    existing.feedback++;
    dateMap.set(dateStr, existing);
  }

  // Process reports
  for (const report of reportsData) {
    // By status
    if (report.status in byStatus) {
      byStatus[report.status as keyof typeof byStatus]++;
    }

    // By priority
    const priority = report.priority || "normal";
    if (priority in byPriority) {
      byPriority[priority as keyof typeof byPriority]++;
    }

    // By date
    const dateStr = new Date(report.createdAt).toISOString().split("T")[0];
    const existing = dateMap.get(dateStr) || {
      feedback: 0,
      report: 0,
      dispute: 0,
    };
    existing.report++;
    dateMap.set(dateStr, existing);
  }

  // Process disputes
  for (const dispute of disputesData) {
    // By status - map dispute statuses
    if (dispute.disputeStatus === "disputed") {
      byStatus.pending++;
    } else if (
      dispute.disputeStatus === "confirmed_canceled" ||
      dispute.disputeStatus === "denied"
    ) {
      byStatus.resolved++;
    }

    // All disputes are high priority
    byPriority.high++;

    // By date
    const dateStr = new Date(dispute.createdAt).toISOString().split("T")[0];
    const existing = dateMap.get(dateStr) || {
      feedback: 0,
      report: 0,
      dispute: 0,
    };
    existing.dispute++;
    dateMap.set(dateStr, existing);
  }

  // Convert date map to sorted array
  const byDate = Array.from(dateMap.entries())
    .map(([date, byType]) => ({
      date,
      count: byType.feedback + byType.report + byType.dispute,
      byType,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    total: feedbackData.length + reportsData.length + disputesData.length,
    byType: {
      feedback: feedbackData.length,
      report: reportsData.length,
      dispute: disputesData.length,
    },
    byStatus,
    byPriority,
    byDate,
  };
}
