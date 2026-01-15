// src/app/api/admin/professionals/route.ts

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { US_STATES, extractStateFromLocation } from "@/lib/constants/us-states";

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
    const state = searchParams.get("state") || "";
    const city = searchParams.get("city") || "";
    const venueType = searchParams.get("venueType") || "";
    const ratingFilter = searchParams.get("ratingFilter") || "";
    const paymentStatus = searchParams.get("paymentStatus") || "";
    const dateFilter = searchParams.get("dateFilter") || "";
    const year = searchParams.get("year") || "";
    const month = searchParams.get("month") || "";
    const includeStats = searchParams.get("includeStats") === "true";

    // NEW: Session time range filter parameters
    const sessionDateFrom = searchParams.get("sessionDateFrom") || "";
    const sessionDateTo = searchParams.get("sessionDateTo") || "";
    const sessionTimeStart = searchParams.get("sessionTimeStart") || "";
    const sessionTimeEnd = searchParams.get("sessionTimeEnd") || "";

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

    // State filter - exact match for US states
    if (state && state !== "all") {
      // Find the state info
      const stateInfo = US_STATES.find(
        (s) => s.abbreviation === state || s.name === state
      );
      if (stateInfo) {
        // Match by state name or abbreviation in location string
        whereClause.OR = [
          ...(whereClause.OR || []),
          { location: { contains: stateInfo.name, mode: "insensitive" } },
          {
            location: { contains: stateInfo.abbreviation, mode: "insensitive" },
          },
        ];
      }
    }

    // City filter - only apply if state is selected
    if (city && city !== "all" && state && state !== "all") {
      whereClause.location = {
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

    // Date filters (for professional creation date)
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

    // Build appointment filter for session time range
    let appointmentFilter: Prisma.AppointmentWhereInput | undefined;
    if (
      sessionDateFrom ||
      sessionDateTo ||
      sessionTimeStart ||
      sessionTimeEnd
    ) {
      appointmentFilter = {};

      if (sessionDateFrom) {
        const fromDate = new Date(sessionDateFrom);
        if (sessionTimeStart) {
          const [hours, minutes] = sessionTimeStart.split(":").map(Number);
          fromDate.setHours(hours, minutes, 0, 0);
        } else {
          fromDate.setHours(0, 0, 0, 0);
        }
        appointmentFilter.startTime = { gte: fromDate };
      }

      if (sessionDateTo) {
        const toDate = new Date(sessionDateTo);
        if (sessionTimeEnd) {
          const [hours, minutes] = sessionTimeEnd.split(":").map(Number);
          toDate.setHours(hours, minutes, 59, 999);
        } else {
          toDate.setHours(23, 59, 59, 999);
        }
        appointmentFilter.endTime = {
          ...((appointmentFilter.endTime as object) || {}),
          lte: toDate,
        };
      }
    }

    // If we have appointment filter, we need to find professionals with matching appointments
    if (appointmentFilter) {
      const professionalsWithSessions = await prisma.appointment.findMany({
        where: appointmentFilter,
        select: { professionalId: true },
        distinct: ["professionalId"],
      });
      const proIds = professionalsWithSessions.map((a) => a.professionalId);
      whereClause.id = { in: proIds };
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
        offersVideo: true,
        videoRate: true,
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

        // Get appointment stats (sessions count)
        const appointmentStats = await prisma.appointment.groupBy({
          by: ["status"],
          where: { professionalId: pro.id },
          _count: true,
        });

        const appointmentStatusCounts: Record<string, number> = {};
        let totalSessions = 0;
        appointmentStats.forEach((stat) => {
          appointmentStatusCounts[stat.status] = stat._count;
          // Count completed sessions as "contributions"
          if (stat.status === "completed" || stat.status === "confirmed") {
            totalSessions += stat._count;
          }
        });

        // Parse location
        const locationParts =
          pro.location?.split(",").map((s: string) => s.trim()) || [];
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
          offersVideo: pro.offersVideo,
          videoRate: pro.videoRate,
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
            totalSessions, // NEW: Number of completed sessions (contributions)
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

      // Payment status distribution (KEEP)
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

      // Contributions stats (sessions count) - REPLACES reviewStats
      const contributionStats = {
        totalSessions: 0,
        withSessions: 0,
        withoutSessions: 0,
        averageSessionsPerPro: 0,
      };

      // Get sessions count per professional
      const sessionCounts = await prisma.appointment.groupBy({
        by: ["professionalId"],
        where: {
          professionalId: {
            in: allFilteredProfessionals.map((p) => p.id),
          },
          status: { in: ["completed", "confirmed"] },
        },
        _count: true,
      });

      const sessionCountMap = new Map(
        sessionCounts.map((s) => [s.professionalId, s._count])
      );

      allFilteredProfessionals.forEach((pro) => {
        const sessions = sessionCountMap.get(pro.id) || 0;
        contributionStats.totalSessions += sessions;
        if (sessions > 0) {
          contributionStats.withSessions++;
        } else {
          contributionStats.withoutSessions++;
        }
      });

      contributionStats.averageSessionsPerPro =
        contributionStats.withSessions > 0
          ? contributionStats.totalSessions / contributionStats.withSessions
          : 0;

      // Location data for interactive map
      const locationMap = new Map<
        string,
        {
          state: string;
          stateAbbr: string;
          city: string;
          latitude: number;
          longitude: number;
          count: number;
          professionals: {
            id: string;
            name: string;
            image: string | null;
            rating: number | null;
            rate: number | null;
            sessions: number;
          }[];
        }
      >();

      for (const pro of allFilteredProfessionals) {
        if (!pro.location) continue;

        const parts = pro.location.split(",").map((s) => s.trim());
        const city = parts[0] || "Unknown";
        // const stateStr = parts[1] || parts[0] || "";

        // Find matching US state
        const stateInfo = extractStateFromLocation(pro.location);
        if (!stateInfo) continue; // Skip non-US locations

        const key = `${city}-${stateInfo.abbreviation}`;
        const sessions = sessionCountMap.get(pro.id) || 0;

        if (locationMap.has(key)) {
          const existing = locationMap.get(key)!;
          existing.count++;
          existing.professionals.push({
            id: pro.id,
            name: "", // Will be populated later
            image: null,
            rating: pro.rating,
            rate: pro.rate,
            sessions,
          });
        } else {
          locationMap.set(key, {
            state: stateInfo.name,
            stateAbbr: stateInfo.abbreviation,
            city,
            latitude: stateInfo.latitude,
            longitude: stateInfo.longitude,
            count: 1,
            professionals: [
              {
                id: pro.id,
                name: "",
                image: null,
                rating: pro.rating,
                rate: pro.rate,
                sessions,
              },
            ],
          });
        }
      }

      // Populate professional names and images
      const proIds = [...locationMap.values()].flatMap((l) =>
        l.professionals.map((p) => p.id)
      );
      const proDetails = await prisma.professional.findMany({
        where: { id: { in: proIds } },
        select: { id: true, name: true, image: true },
      });
      const proDetailMap = new Map(proDetails.map((p) => [p.id, p]));

      for (const location of locationMap.values()) {
        for (const pro of location.professionals) {
          const details = proDetailMap.get(pro.id);
          if (details) {
            pro.name = details.name;
            pro.image = details.image;
          }
        }
      }

      const mapLocationData = [...locationMap.values()];

      // Aggregate earnings stats (KEEP)
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
        paymentStatusDistribution,
        contributionStats, // NEW: Replaces reviewStats
        mapLocationData, // NEW: For interactive map
        earningsStats: {
          totalGross: earningsStats._sum.grossAmount || 0,
          totalPlatformFees: earningsStats._sum.platformFeeAmount || 0,
          averageEarning: earningsStats._avg.grossAmount || 0,
          totalTransactions: earningsStats._count,
        },
      };
    }

    // Get cities for selected state (for dependent dropdown)
    let citiesForState: string[] = [];
    if (state && state !== "all") {
      const stateInfo = US_STATES.find(
        (s) => s.abbreviation === state || s.name === state
      );
      if (stateInfo) {
        const professionalsInState = await prisma.professional.findMany({
          where: {
            OR: [
              { location: { contains: stateInfo.name, mode: "insensitive" } },
              {
                location: {
                  contains: stateInfo.abbreviation,
                  mode: "insensitive",
                },
              },
            ],
          },
          select: { location: true },
        });

        const cities = new Set<string>();
        professionalsInState.forEach((p) => {
          if (p.location) {
            const parts = p.location.split(",").map((s) => s.trim());
            if (parts[0]) cities.add(parts[0]);
          }
        });
        citiesForState = [...cities].sort();
      }
    }

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
        states: US_STATES.map((s) => ({
          name: s.name,
          abbreviation: s.abbreviation,
        })),
        cities: citiesForState,
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
