// app/api/professionals/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import {
  getProfessionals,
  getProfessionalById,
  getUniqueLocations,
} from "@/lib/services/professionals";
import {
  professionalFiltersSchema,
  professionalIdSchema,
} from "@/lib/validations/professionals";
import prisma from "@/lib/prisma";

/**
 * GET /api/professionals
 *
 * Query params:
 * - id: Get single professional by ID
 * - All filter params for list view
 * - includeLocations: Include unique locations list
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const includeLocations = searchParams.get("includeLocations") === "true";

    // Single professional fetch
    if (id) {
      const validation = professionalIdSchema.safeParse(id);
      if (!validation.success) {
        return NextResponse.json(
          { error: "Invalid professional ID" },
          { status: 400 }
        );
      }

      const professional = await getProfessionalById(id);

      if (!professional) {
        return NextResponse.json(
          { error: "Professional not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(professional);
    }

    // Parse and validate filters from query params
    const filterParams: Record<string, string | undefined> = {};

    const filterKeys = [
      "search",
      "location",
      "venue",
      "minRating",
      "gender",
      "minAge",
      "maxAge",
      "hasProfilePic",
      "onlineStatus",
      "currentLat",
      "currentLng",
      "radius",
      "unit",
      "date",
      "timeRangeStart",
      "timeRangeEnd",
      "sortBy",
      "page",
      "limit",
    ];

    filterKeys.forEach((key) => {
      const value = searchParams.get(key);
      if (value) filterParams[key] = value;
    });

    // Handle legacy param names
    if (searchParams.get("selectedDate")) {
      const dateStr = searchParams.get("selectedDate")!;
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        filterParams.date = date.toISOString().split("T")[0];
      }
    }

    const validation = professionalFiltersSchema.safeParse(filterParams);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid filter parameters",
          details: validation.error.format(),
        },
        { status: 400 }
      );
    }

    const filters = validation.data;

    // Check if date filter is applied to include availability
    const includeAvailability = !!filters.date;

    // Fetch professionals
    const result = await getProfessionals({
      filters,
      excludeUserId: session.user.id,
      includeAvailability,
    });

    // Optionally include unique locations
    let locations: string[] | undefined;
    if (includeLocations) {
      locations = await getUniqueLocations();
    }

    return NextResponse.json({
      professionals: result.professionals.map((p) => ({
        id: p._id,
        name: p.name,
        image: p.image,
        location: p.location,
        rating: p.rating,
        reviewCount: p.reviewCount,
        rate: p.rate,
        biography: p.biography,
        createdAt: p.createdAt,
        venue: p.venue,
        lastOnline: p.lastOnline,
        ethnicity: p.ethnicity,
        userId: p.userId,
        availableSlots: p.availableSlots,
      })),
      total: result.total,
      page: result.page,
      limit: result.limit,
      hasMore: result.hasMore,
      ...(locations && { locations }),
    });
  } catch (error) {
    console.error("GET /api/professionals error:", error);
    return NextResponse.json(
      { error: "Failed to fetch professionals" },
      { status: 500 }
    );
  }
}

/**
 * POST - Disabled (use application flow)
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Direct professional creation is not allowed. Use the application flow.",
    },
    { status: 405 }
  );
}

/**
 * PATCH - Update professional profile
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      id,
      name,
      image,
      location,
      rating,
      reviewCount,
      rate,
      biography,
      venue,
    } = body;

    if (!id || !name || !biography) {
      return NextResponse.json(
        { error: "ID, name, and biography are required" },
        { status: 400 }
      );
    }

    const idValidation = professionalIdSchema.safeParse(id);
    if (!idValidation.success) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    if (venue && !["host", "visit", "both"].includes(venue)) {
      return NextResponse.json(
        { error: "Invalid venue value" },
        { status: 400 }
      );
    }

    // Verify ownership
    const application = await prisma.professionalApplication.findFirst({
      where: {
        professionalId: id,
        userId: session.user.id,
        status: "APPROVED",
      },
    });

    if (!application) {
      return NextResponse.json(
        { error: "You can only update your own approved professional profile" },
        { status: 403 }
      );
    }

    // Update professional
    const professional = await prisma.professional.update({
      where: { id },
      data: { name, image, rating, reviewCount, rate, biography, venue },
      select: {
        id: true,
        name: true,
        image: true,
        rating: true,
        reviewCount: true,
        rate: true,
        biography: true,
        createdAt: true,
        venue: true,
        location: true,
      },
    });

    // Update user location if provided
    if (location) {
      await prisma.user.update({
        where: { id: application.userId },
        data: { location },
      });
    }

    return NextResponse.json({
      id: professional.id,
      name: professional.name,
      image: professional.image,
      location: location || professional.location,
      rating: professional.rating,
      reviewCount: professional.reviewCount,
      rate: professional.rate,
      biography: professional.biography,
      createdAt: professional.createdAt,
      venue: professional.venue,
    });
  } catch (error) {
    console.error("PATCH /api/professionals error:", error);
    return NextResponse.json(
      { error: "Failed to update professional" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Remove professional (admin only)
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const { id } = await request.json();

    const idValidation = professionalIdSchema.safeParse(id);
    if (!idValidation.success) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const professional = await prisma.professional.delete({
      where: { id },
      select: { id: true, name: true },
    });

    return NextResponse.json({
      message: "Professional deleted",
      id: professional.id,
    });
  } catch (error: unknown) {
    console.error("DELETE /api/professionals error:", error);

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Professional not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Failed to delete professional" },
      { status: 500 }
    );
  }
}
