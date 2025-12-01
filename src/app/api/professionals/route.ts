// app/api/professionals/route.ts

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

/* ------------------------------------------------------------------
   GET – single or list with filtering
   ------------------------------------------------------------------ */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    // Single professional fetch
    if (id) {
      if (!/^[0-9a-fA-F]{24}$/.test(id)) {
        return NextResponse.json(
          { error: "Invalid professional ID" },
          { status: 400 }
        );
      }

      const professional = await prisma.professional.findUnique({
        where: { id },
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
          application: {
            select: {
              id: true,
              status: true,
              userId: true,
              user: {
                select: {
                  location: true,
                  lastOnline: true,
                  ethnicity: true,
                  profileImage: true,
                },
              },
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

      return NextResponse.json({
        id: professional.id,
        name: professional.name,
        image:
          professional.application?.user?.profileImage || professional.image,
        location:
          professional.location ||
          professional.application?.user?.location ||
          null,
        userId: professional.application?.userId || null,
        rating: professional.rating,
        reviewCount: professional.reviewCount,
        rate: professional.rate,
        biography: professional.biography,
        createdAt: professional.createdAt,
        venue: professional.venue,
        lastOnline: professional.application?.user?.lastOnline || null,
        ethnicity: professional.application?.user?.ethnicity || null,

        status: professional.application?.status || null,
        applicationId: professional.application?.id,
      });
    }

    // List fetch with filters
    const search = searchParams.get("search");
    const venue = searchParams.get("venue");
    const minRating = searchParams.get("minRating");
    const location = searchParams.get("location");

    // Build where clause
    const where: Prisma.ProfessionalWhereInput = {};

    // Exclude self if user is an approved professional
    const userApplication = await prisma.professionalApplication.findFirst({
      where: {
        userId: session.user.id,
        status: "APPROVED",
      },
      select: { professionalId: true },
    });

    if (userApplication?.professionalId) {
      where.id = { not: userApplication.professionalId };
    }

    // Search filter (name or biography)
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { biography: { contains: search, mode: "insensitive" } },
      ];
    }

    // Venue filter
    if (venue && ["host", "visit", "both"].includes(venue)) {
      if (venue === "both") {
        // Show all venues
      } else {
        // Show professionals who can do this venue type OR both
        where.venue = { in: [venue as "host" | "visit", "both"] };
      }
    }

    // Rating filter
    if (minRating) {
      const rating = parseFloat(minRating);
      if (!isNaN(rating) && rating > 0) {
        where.rating = { gte: rating };
      }
    }

    const professionals = await prisma.professional.findMany({
      where,
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
        application: {
          select: {
            userId: true,
            user: {
              select: {
                location: true,
                lastOnline: true,
                ethnicity: true,
                profileImage: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Post-query location filter (since it can be on Professional or User)
    let filtered = professionals;
    if (
      location &&
      location !== "Custom Location" &&
      location !== "Current Location"
    ) {
      filtered = professionals.filter((p) => {
        const profLocation = p.location || p.application?.user?.location;
        return profLocation === location;
      });
    }

    return NextResponse.json({
      professionals: filtered.map((s) => ({
        id: s.id,
        name: s.name,
        image: s.application?.user?.profileImage || s.image,
        location: s.location || s.application?.user?.location || null,
        userId: s.application?.userId || null,
        rating: s.rating,
        reviewCount: s.reviewCount,
        rate: s.rate,
        biography: s.biography,
        createdAt: s.createdAt,
        venue: s.venue,
        lastOnline: s.application?.user?.lastOnline || null,
        ethnicity: s.application?.user?.ethnicity || null,
      })),
    });
  } catch (error) {
    console.error("GET Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/* ------------------------------------------------------------------
   POST – **DISABLED** (creation only via application approval)
   ------------------------------------------------------------------ */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Direct professional creation is not allowed. Use the professional-application flow.",
    },
    { status: 405 }
  );
}

/* ------------------------------------------------------------------
   PATCH – edit approved professional
   ------------------------------------------------------------------ */
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
    } = await req.json();

    if (!id || !name || !biography) {
      return NextResponse.json(
        { error: "ID, name, and biography are required" },
        { status: 400 }
      );
    }

    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    if (venue && !["host", "visit", "both"].includes(venue)) {
      return NextResponse.json(
        { error: "Invalid venue value" },
        { status: 400 }
      );
    }

    const application = await prisma.professionalApplication.findFirst({
      where: {
        professionalId: id,
        userId: session.user.id,
        status: "APPROVED",
      },
    });

    if (!application) {
      return NextResponse.json(
        {
          error:
            "Unauthorized: You can only update your own approved professional profile",
        },
        { status: 403 }
      );
    }

    const professional = await prisma.professional.update({
      where: { id },
      data: {
        name,
        image,
        rating,
        reviewCount,
        rate,
        biography,
        venue,
      },
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
        application: {
          select: {
            userId: true,
            user: {
              select: {
                location: true,
                lastOnline: true,
              },
            },
          },
        },
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
      location: location || professional.application?.user?.location || null,
      userId: professional.application?.userId || null,
      rating: professional.rating,
      reviewCount: professional.reviewCount,
      rate: professional.rate,
      biography: professional.biography,
      createdAt: professional.createdAt,
      venue: professional.venue,
      lastOnline: professional.application?.user?.lastOnline || null,
    });
  } catch (error) {
    console.error("PATCH Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/* ------------------------------------------------------------------
   DELETE – remove professional (admin only)
   ------------------------------------------------------------------ */
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    // Security: Require admin authentication
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const professional = await prisma.professional.delete({
      where: { id },
      select: { id: true, name: true },
    });

    console.log("Professional deleted:", professional);
    return NextResponse.json({
      message: "Professional deleted",
      id: professional.id,
    });
  } catch (error: unknown) {
    console.error("DELETE Error:", error);

    // Handle "record not found" error
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

    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
