// src/app/api/admin/professionals/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true },
    });

    if (!currentUser?.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    // Filters
    const location = searchParams.get("location") || "";
    const state = searchParams.get("state") || "";
    const city = searchParams.get("city") || "";
    const venueType = searchParams.get("venueType") || "";
    const ratingFilter = searchParams.get("ratingFilter") || "";
    const rateMin = searchParams.get("rateMin") || "";
    const rateMax = searchParams.get("rateMax") || "";
    const paymentStatus = searchParams.get("paymentStatus") || "";
    const dateFilter = searchParams.get("dateFilter") || "";
    const year = searchParams.get("year") || "";
    const month = searchParams.get("month") || "";
    const includeStats = searchParams.get("includeStats") === "true";

    const skip = (page - 1) * limit;

    // Build where clause
    const whereClause: Prisma.ProfessionalWhereInput = {};

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { biography: { contains: search, mode: "insensitive" } },
        { location: { contains: search, mode: "insensitive" } },
      ];
    }

    // Location filters
    if (location) {
      whereClause.location = { contains: location, mode: "insensitive" };
    }

    if (state) {
      whereClause.location = {
        ...((whereClause.location as Prisma.StringFilter) || {}),
        contains: state,
        mode: "insensitive",
      };
    }

    if (city) {
      whereClause.location = {
        ...((whereClause.location as Prisma.StringFilter) || {}),
        contains: city,
        mode: "insensitive",
      };
    }

    // Venue type filter
    if (venueType && venueType !== "all") {
      whereClause.venue = venueType as "host" | "visit" | "both";
    }

    // Rating filter
    if (ratingFilter && ratingFilter !== "all") {
      const minRating = parseFloat(ratingFilter);
      if (!isNaN(minRating)) {
        whereClause.rating = { gte: minRating };
      }
    }

    // Rate range filter
    if (rateMin) {
      const min = parseFloat(rateMin);
      if (!isNaN(min)) {
        whereClause.rate = {
          ...((whereClause.rate as Prisma.FloatFilter) || {}),
          gte: min,
        };
      }
    }

    if (rateMax) {
      const max = parseFloat(rateMax);
      if (!isNaN(max)) {
        whereClause.rate = {
          ...((whereClause.rate as Prisma.FloatFilter) || {}),
          lte: max,
        };
      }
    }

    // Payment status filter
    if (paymentStatus && paymentStatus !== "all") {
      switch (paymentStatus) {
        case "valid":
          whereClause.hasValidPaymentMethod = true;
          whereClause.paymentBlockedAt = null;
          break;
        case "invalid":
          whereClause.hasValidPaymentMethod = false;
          break;
        case "blocked":
          whereClause.paymentBlockedAt = { not: null };
          break;
      }
    }

    // Date filters
    if (dateFilter && dateFilter !== "all") {
      const now = new Date();
      let startDate: Date | undefined;
      let endDate: Date | undefined;

      switch (dateFilter) {
        case "thisWeek":
          startDate = new Date(now);
          startDate.setDate(now.getDate() - now.getDay());
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(now);
          break;
        case "lastWeek":
          startDate = new Date(now);
          startDate.setDate(now.getDate() - now.getDay() - 7);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(now);
          endDate.setDate(now.getDate() - now.getDay());
          endDate.setHours(0, 0, 0, 0);
          break;
        case "thisMonth":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now);
          break;
        case "lastMonth":
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          endDate = new Date(now.getFullYear(), now.getMonth(), 0);
          break;
        case "thisYear":
          startDate = new Date(now.getFullYear(), 0, 1);
          endDate = new Date(now);
          break;
        case "lastYear":
          startDate = new Date(now.getFullYear() - 1, 0, 1);
          endDate = new Date(now.getFullYear() - 1, 11, 31);
          break;
        case "custom":
          if (year && year !== "all") {
            const yearNum = parseInt(year);
            if (month && month !== "all") {
              const monthNum = parseInt(month) - 1;
              startDate = new Date(yearNum, monthNum, 1);
              endDate = new Date(yearNum, monthNum + 1, 0);
            } else {
              startDate = new Date(yearNum, 0, 1);
              endDate = new Date(yearNum, 11, 31);
            }
          }
          break;
      }

      if (startDate && endDate) {
        whereClause.createdAt = {
          gte: startDate,
          lte: endDate,
        };
      }
    }

    // Build sort object
    const sortObject: Prisma.ProfessionalOrderByWithRelationInput = {};
    const validSortFields = [
      "createdAt",
      "name",
      "rating",
      "rate",
      "reviewCount",
    ];
    const validSortOrder = ["asc", "desc"] as const;

    if (
      validSortFields.includes(sortBy) &&
      validSortOrder.includes(sortOrder as "asc" | "desc")
    ) {
      const key = sortBy as keyof Prisma.ProfessionalOrderByWithRelationInput;
      const order: Prisma.SortOrder = sortOrder as Prisma.SortOrder;
      sortObject[key] = order;
    } else {
      sortObject.createdAt = "desc";
    }

    // Get total count
    const totalProfessionals = await prisma.professional.count({
      where: whereClause,
    });

    // Fetch professionals
    const professionals = await prisma.professional.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        image: true,
        rating: true,
        reviewCount: true,
        rate: true,
        biography: true,
        companyCutPercentage: true,
        venue: true,
        createdAt: true,
        location: true,
        hasValidPaymentMethod: true,
        paymentBlockedAt: true,
        paymentBlockReason: true,
        cardLast4: true,
        cardBrand: true,
        paymentAcceptanceMethods: true,
        applications: {
          select: {
            id: true,
            userId: true,
            status: true,
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                lastOnline: true,
                profileImage: true,
              },
            },
          },
          take: 1,
        },
        _count: {
          select: {
            appointments: true,
            reviews: true,
            profileVisits: true,
            earnings: true,
            availability: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: sortObject,
    });

    // Calculate additional stats for each professional
    const formattedProfessionals = await Promise.all(
      professionals.map(async (pro) => {
        // Get earnings summary
        const earningsAgg = await prisma.earning.aggregate({
          where: { professionalId: pro.id },
          _sum: { grossAmount: true, platformFeeAmount: true },
          _count: true,
        });

        // Get appointment stats
        const appointmentStats = await prisma.appointment.groupBy({
          by: ["status"],
          where: { professionalId: pro.id },
          _count: true,
        });

        const appointmentStatusCounts: Record<string, number> = {};
        appointmentStats.forEach((stat) => {
          appointmentStatusCounts[stat.status] = stat._count;
        });

        // Parse location
        const locationParts =
          pro.location?.split(",").map((s) => s.trim()) || [];
        const parsedLocation = {
          city: locationParts[0] || "",
          state: locationParts[1] || "",
          country: locationParts[2] || locationParts[1] || "",
        };

        // Get linked user info
        const linkedUser = pro.applications[0]?.user || null;

        return {
          id: pro.id,
          name: pro.name,
          image: pro.image,
          rating: pro.rating,
          reviewCount: pro.reviewCount || 0,
          rate: pro.rate,
          biography: pro.biography,
          companyCutPercentage: pro.companyCutPercentage,
          venue: pro.venue,
          createdAt: pro.createdAt,
          location: pro.location,
          parsedLocation,
          paymentStatus: {
            hasValidPaymentMethod: pro.hasValidPaymentMethod,
            isBlocked: !!pro.paymentBlockedAt,
            blockReason: pro.paymentBlockReason,
            cardLast4: pro.cardLast4,
            cardBrand: pro.cardBrand,
            acceptanceMethods: pro.paymentAcceptanceMethods,
          },
          linkedUser: linkedUser
            ? {
                id: linkedUser.id,
                email: linkedUser.email,
                name: linkedUser.name,
                lastOnline: linkedUser.lastOnline,
                profileImage: linkedUser.profileImage,
              }
            : null,
          applicationStatus: pro.applications[0]?.status || null,
          stats: {
            totalAppointments: pro._count.appointments,
            appointmentsByStatus: appointmentStatusCounts,
            totalReviews: pro._count.reviews,
            profileVisits: pro._count.profileVisits,
            totalEarnings: earningsAgg._sum.grossAmount || 0,
            platformFees: earningsAgg._sum.platformFeeAmount || 0,
            earningsCount: earningsAgg._count,
            availabilitySlots: pro._count.availability,
          },
        };
      })
    );

    // Generate statistics if requested
    let statistics = null;
    if (includeStats) {
      const allFilteredProfessionals = await prisma.professional.findMany({
        where: whereClause,
        select: {
          id: true,
          createdAt: true,
          rating: true,
          rate: true,
          venue: true,
          location: true,
          hasValidPaymentMethod: true,
          paymentBlockedAt: true,
          reviewCount: true,
          _count: {
            select: {
              appointments: true,
              reviews: true,
            },
          },
        },
      });

      // Monthly registration stats (last 12 months)
      const monthlyStats: { [key: string]: number } = {};
      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        monthlyStats[key] = 0;
      }

      allFilteredProfessionals.forEach((pro) => {
        const date = new Date(pro.createdAt);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        if (monthlyStats[key] !== undefined) {
          monthlyStats[key]++;
        }
      });

      // Weekly registration stats (last 8 weeks)
      const weeklyStats: { [key: string]: number } = {};
      for (let i = 7; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i * 7);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const key = weekStart.toISOString().split("T")[0];
        weeklyStats[key] = 0;
      }

      allFilteredProfessionals.forEach((pro) => {
        const date = new Date(pro.createdAt);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const key = weekStart.toISOString().split("T")[0];
        if (weeklyStats[key] !== undefined) {
          weeklyStats[key]++;
        }
      });

      // Venue type distribution
      const venueDistribution = {
        host: 0,
        visit: 0,
        both: 0,
      };

      allFilteredProfessionals.forEach((pro) => {
        if (pro.venue) {
          venueDistribution[pro.venue]++;
        }
      });

      // Rating distribution
      const ratingDistribution = {
        excellent: 0, // 4.5+
        good: 0, // 3.5-4.5
        average: 0, // 2.5-3.5
        poor: 0, // 1-2.5
        noRating: 0, // null
      };

      allFilteredProfessionals.forEach((pro) => {
        if (pro.rating === null) {
          ratingDistribution.noRating++;
        } else if (pro.rating >= 4.5) {
          ratingDistribution.excellent++;
        } else if (pro.rating >= 3.5) {
          ratingDistribution.good++;
        } else if (pro.rating >= 2.5) {
          ratingDistribution.average++;
        } else {
          ratingDistribution.poor++;
        }
      });

      // Payment status distribution
      const paymentStatusDistribution = {
        valid: 0,
        invalid: 0,
        blocked: 0,
      };

      allFilteredProfessionals.forEach((pro) => {
        if (pro.paymentBlockedAt) {
          paymentStatusDistribution.blocked++;
        } else if (pro.hasValidPaymentMethod) {
          paymentStatusDistribution.valid++;
        } else {
          paymentStatusDistribution.invalid++;
        }
      });

      // Rate distribution
      const rateRanges = [
        { label: "$0-50", min: 0, max: 50, count: 0 },
        { label: "$51-100", min: 51, max: 100, count: 0 },
        { label: "$101-150", min: 101, max: 150, count: 0 },
        { label: "$151-200", min: 151, max: 200, count: 0 },
        { label: "$201+", min: 201, max: Infinity, count: 0 },
      ];

      allFilteredProfessionals.forEach((pro) => {
        if (pro.rate) {
          const range = rateRanges.find(
            (r) => pro.rate! >= r.min && pro.rate! <= r.max
          );
          if (range) range.count++;
        }
      });

      // Review contribution stats
      const reviewStats = {
        withReviews: 0,
        withoutReviews: 0,
        totalReviews: 0,
        averageReviewsPerPro: 0,
      };

      allFilteredProfessionals.forEach((pro) => {
        if (pro._count.reviews > 0) {
          reviewStats.withReviews++;
          reviewStats.totalReviews += pro._count.reviews;
        } else {
          reviewStats.withoutReviews++;
        }
      });

      reviewStats.averageReviewsPerPro =
        reviewStats.withReviews > 0
          ? reviewStats.totalReviews / reviewStats.withReviews
          : 0;

      // Top locations
      const locationCounts: { [key: string]: number } = {};
      allFilteredProfessionals.forEach((pro) => {
        if (pro.location) {
          const parts = pro.location.split(",").map((s) => s.trim());
          const state = parts[1] || parts[0] || "Unknown";
          locationCounts[state] = (locationCounts[state] || 0) + 1;
        } else {
          locationCounts["Unknown"] = (locationCounts["Unknown"] || 0) + 1;
        }
      });

      const topLocations = Object.entries(locationCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([location, count]) => ({ location, count }));

      // Top performers by reviews
      const topByReviews = [...allFilteredProfessionals]
        .sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0))
        .slice(0, 5)
        .map((pro) => ({
          id: pro.id,
          reviewCount: pro.reviewCount || 0,
          rating: pro.rating,
        }));

      // Aggregate earnings stats
      const earningsStats = await prisma.earning.aggregate({
        where: {
          professionalId: {
            in: allFilteredProfessionals.map((p) => p.id),
          },
        },
        _sum: {
          grossAmount: true,
          platformFeeAmount: true,
        },
        _avg: {
          grossAmount: true,
        },
        _count: true,
      });

      statistics = {
        totalFiltered: allFilteredProfessionals.length,
        monthlyRegistrations: Object.entries(monthlyStats).map(
          ([month, count]) => ({
            month,
            count,
          })
        ),
        weeklyRegistrations: Object.entries(weeklyStats).map(
          ([week, count]) => ({
            week,
            count,
          })
        ),
        venueDistribution,
        ratingDistribution,
        paymentStatusDistribution,
        rateDistribution: rateRanges.map((r) => ({
          range: r.label,
          count: r.count,
        })),
        reviewStats,
        topLocations,
        topByReviews,
        earningsStats: {
          totalGross: earningsStats._sum.grossAmount || 0,
          totalPlatformFees: earningsStats._sum.platformFeeAmount || 0,
          averageEarning: earningsStats._avg.grossAmount || 0,
          totalTransactions: earningsStats._count,
        },
      };
    }

    // Get unique locations for filter options
    const uniqueLocations = await prisma.professional.findMany({
      where: { location: { not: null } },
      select: { location: true },
      distinct: ["location"],
    });

    const locationOptions = uniqueLocations
      .filter((p) => p.location)
      .map((p) => {
        const parts = p.location!.split(",").map((s) => s.trim());
        return {
          full: p.location,
          city: parts[0] || "",
          state: parts[1] || "",
          country: parts[2] || parts[1] || "",
        };
      });

    const uniqueStates = [
      ...new Set(locationOptions.map((l) => l.state).filter(Boolean)),
    ].sort();
    const uniqueCities = [
      ...new Set(locationOptions.map((l) => l.city).filter(Boolean)),
    ].sort();

    // Get rate range for filter
    const rateRange = await prisma.professional.aggregate({
      _min: { rate: true },
      _max: { rate: true },
    });

    return NextResponse.json({
      data: formattedProfessionals,
      pagination: {
        total: totalProfessionals,
        page,
        limit,
        pages: Math.ceil(totalProfessionals / limit),
        hasMore: page < Math.ceil(totalProfessionals / limit),
      },
      filterOptions: {
        states: uniqueStates,
        cities: uniqueCities,
        rateRange: {
          min: rateRange._min.rate || 0,
          max: rateRange._max.rate || 500,
        },
      },
      statistics,
    });
  } catch (error) {
    console.error("GET /api/admin/professionals error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
