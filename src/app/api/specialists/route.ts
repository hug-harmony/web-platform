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
    venue: true;
    application: {
      select: {
        userId: true;
        user: { select: { location: true } };
      };
    };
  };
}>;

/* ------------------------------------------------------------------
   GET – single or list (unchanged)
   ------------------------------------------------------------------ */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const venue = searchParams.get("venue");

    if (id) {
      if (!/^[0-9a-fA-F]{24}$/.test(id)) {
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
            venue: true,
            application: {
              select: {
                userId: true,
                user: { select: { location: true } },
              },
            },
          },
        });
      if (!specialist) {
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
        userId: specialist.application?.userId || null,
        rating: specialist.rating,
        reviewCount: specialist.reviewCount,
        rate: specialist.rate,
        biography: specialist.biography,
        createdAt: specialist.createdAt,
        venue: specialist.venue,
      });
    }

    const userApplication = await prisma.specialistApplication.findFirst({
      where: {
        userId: session.user.id,
        status: "APPROVED",
      },
      select: { specialistId: true },
    });

    const specialists: SpecialistWithRelations[] =
      await prisma.specialist.findMany({
        where: {
          ...(userApplication?.specialistId
            ? { id: { not: userApplication.specialistId } }
            : {}),
          ...(venue
            ? {
                venue: {
                  in: venue.split(",").map((v) => v.trim()) as any,
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
          venue: true,
          application: {
            select: {
              userId: true,
              user: { select: { location: true } },
            },
          },
        },
      });

    return NextResponse.json({
      specialists: specialists.map((s) => ({
        id: s.id,
        name: s.name,
        image: s.image,
        location: s.application?.user?.location || null,
        userId: s.application?.userId || null,
        rating: s.rating,
        reviewCount: s.reviewCount,
        rate: s.rate,
        biography: s.biography,
        createdAt: s.createdAt,
        venue: s.venue,
      })),
    });
  } catch (error) {
    console.error("GET Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

/* ------------------------------------------------------------------
   POST – **DISABLED** (creation only via application approval)
   ------------------------------------------------------------------ */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Direct specialist creation is not allowed. Use the professional-application flow.",
    },
    { status: 405 }
  );
}

/* ------------------------------------------------------------------
   PATCH – edit approved specialist (unchanged)
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

    const application = await prisma.specialistApplication.findFirst({
      where: { specialistId: id, userId: session.user.id, status: "APPROVED" },
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
        application: {
          select: {
            userId: true,
            user: { select: { location: true } },
          },
        },
      },
    });

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
      userId: specialist.application?.userId || null,
      rating: specialist.rating,
      reviewCount: specialist.reviewCount,
      rate: specialist.rate,
      biography: specialist.biography,
      createdAt: specialist.createdAt,
      venue: specialist.venue,
    });
  } catch (error) {
    console.error("PATCH Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

/* ------------------------------------------------------------------
   DELETE – remove specialist (unchanged)
   ------------------------------------------------------------------ */
export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const specialist = await prisma.specialist.delete({
      where: { id },
      select: { id: true, name: true },
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
