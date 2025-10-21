/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

const prisma = new PrismaClient();

type SpecialistWithRelations = Prisma.SpecialistGetPayload<{
  select: {
    id: true;
    name: true;
    image: true;
    rating: true;
    reviewCount: true;
    rate: true;
    biography: true;
    createdAt: true;
    venue: true; // Changed from venuePreferences
    application: {
      select: {
        user: { select: { location: true } };
      };
    };
  };
}>;

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const venue = searchParams.get("venue"); // Changed from venuePreferences

    if (id) {
      if (!/^[0-9a-fA-F]{24}$/.test(id)) {
        console.log("Invalid specialist ID:", id);
        return NextResponse.json(
          { error: "Invalid specialist ID" },
          { status: 400 }
        );
      }
      const specialist: SpecialistWithRelations | null =
        await prisma.specialist.findUnique({
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
            venue: true, // Changed from venuePreferences
            application: {
              select: {
                user: { select: { location: true } },
              },
            },
          },
        });
      if (!specialist) {
        console.log("Specialist not found for ID:", id);
        return NextResponse.json(
          { error: "Specialist not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({
        id: specialist.id,
        name: specialist.name,
        image: specialist.image,
        location: specialist.application?.user?.location || null,
        rating: specialist.rating,
        reviewCount: specialist.reviewCount,
        rate: specialist.rate,
        biography: specialist.biography,
        createdAt: specialist.createdAt,
        venue: specialist.venue, // Changed from venuePreferences
      });
    }

    // Find the logged-in user's specialistId, if any
    const userApplication = await prisma.specialistApplication.findFirst({
      where: {
        userId: session.user.id,
        status: "approved",
      },
      select: { specialistId: true },
    });

    const specialists: SpecialistWithRelations[] =
      await prisma.specialist.findMany({
        where: {
          ...(userApplication?.specialistId
            ? {
                id: {
                  not: userApplication.specialistId,
                },
              }
            : {}),
          ...(venue
            ? {
                venue: {
                  in: venue.split(",").map((v) => v.trim()) as any, // Handle comma-separated venue values
                },
              }
            : {}),
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
          venue: true, // Changed from venuePreferences
          application: {
            select: {
              user: { select: { location: true } },
            },
          },
        },
      });

    return NextResponse.json({
      specialists: specialists.map((specialist) => ({
        id: specialist.id,
        name: specialist.name,
        image: specialist.image,
        location: specialist.application?.user?.location || null,
        rating: specialist.rating,
        reviewCount: specialist.reviewCount,
        rate: specialist.rate,
        biography: specialist.biography,
        createdAt: specialist.createdAt,
        venue: specialist.venue, // Changed from venuePreferences
      })),
    });
  } catch (error) {
    console.error("GET Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      name,
      image,
      location,
      rating,
      reviewCount,
      rate,
      biography,
      venue,
    } = await req.json();

    if (!name || !biography) {
      return NextResponse.json(
        { error: "Required fields (name, biography) missing" },
        { status: 400 }
      );
    }

    // Validate venue
    if (venue && !["host", "visit", "both"].includes(venue)) {
      return NextResponse.json(
        { error: "Invalid venue value" },
        { status: 400 }
      );
    }

    const specialist = await prisma.specialist.create({
      data: {
        name,
        image,
        rating,
        reviewCount,
        rate,
        biography,
        venue: venue || "both", // Default to "both" if not provided
      },
    });

    // Create SpecialistApplication to link to the authenticated user
    await prisma.specialistApplication.create({
      data: {
        userId: session.user.id,
        specialistId: specialist.id,
        biography,
        rate,
        status: "pending",
      },
    });

    // Update location in the User model if provided
    if (location) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { location },
      });
    }

    console.log("Specialist created:", specialist);
    return NextResponse.json(
      {
        id: specialist.id,
        name: specialist.name,
        image: specialist.image,
        location,
        rating: specialist.rating,
        reviewCount: specialist.reviewCount,
        rate: specialist.rate,
        biography: specialist.biography,
        createdAt: specialist.createdAt,
        venue: specialist.venue, // Changed from venuePreferences
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
      console.log("Invalid specialist ID:", id);
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    // Validate venue
    if (venue && !["host", "visit", "both"].includes(venue)) {
      return NextResponse.json(
        { error: "Invalid venue value" },
        { status: 400 }
      );
    }

    // Check if the user is authorized to update this specialist
    const application = await prisma.specialistApplication.findFirst({
      where: { specialistId: id, userId: session.user.id, status: "approved" },
    });
    if (!application) {
      return NextResponse.json(
        {
          error:
            "Unauthorized: You can only update your own approved specialist profile",
        },
        { status: 403 }
      );
    }

    const specialist: SpecialistWithRelations = await prisma.specialist.update({
      where: { id },
      data: {
        name,
        image,
        rating,
        reviewCount,
        rate,
        biography,
        venue, // Changed from venuePreferences
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
        venue: true, // Changed from venuePreferences
        application: {
          select: {
            user: { select: { location: true } },
          },
        },
      },
    });

    // Update location in the User model if provided
    if (location) {
      await prisma.user.update({
        where: { id: application.userId },
        data: { location },
      });
    }

    return NextResponse.json({
      id: specialist.id,
      name: specialist.name,
      image: specialist.image,
      location: specialist.application?.user?.location || null,
      rating: specialist.rating,
      reviewCount: specialist.reviewCount,
      rate: specialist.rate,
      biography: specialist.biography,
      createdAt: specialist.createdAt,
      venue: specialist.venue, // Changed from venuePreferences
    });
  } catch (error) {
    console.error("PATCH Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      console.log("Invalid specialist ID:", id);
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const specialist = await prisma.specialist.delete({
      where: { id },
      select: {
        id: true,
        name: true,
      },
    });

    console.log("Specialist deleted:", specialist);
    return NextResponse.json({ message: "Specialist deleted" });
  } catch (error) {
    console.error("DELETE Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
