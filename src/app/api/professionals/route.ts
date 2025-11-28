import { NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

const prisma = new PrismaClient();

type ProfessionalWithRelations = Prisma.ProfessionalGetPayload<{
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

    if (id) {
      if (!/^[0-9a-fA-F]{24}$/.test(id)) {
        return NextResponse.json(
          { error: "Invalid professional ID" },
          { status: 400 }
        );
      }
      const professional: ProfessionalWithRelations | null =
        await prisma.professional.findUnique({
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
      if (!professional) {
        return NextResponse.json(
          { error: "Professional not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({
        id: professional.id,
        name: professional.name,
        image: professional.image,
        location: professional.application?.user?.location || null,
        userId: professional.application?.userId || null,
        rating: professional.rating,
        reviewCount: professional.reviewCount,
        rate: professional.rate,
        biography: professional.biography,
        createdAt: professional.createdAt,
        venue: professional.venue,
      });
    }

    const userApplication = await prisma.professionalApplication.findFirst({
      where: {
        userId: session.user.id,
        status: "APPROVED",
      },
      select: { professionalId: true },
    });

    const professionals: ProfessionalWithRelations[] =
      await prisma.professional.findMany({
        where: {
          ...(userApplication?.professionalId
            ? { id: { not: userApplication.professionalId } }
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
      professionals: professionals.map((s) => ({
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
        "Direct professional creation is not allowed. Use the professional-application flow.",
    },
    { status: 405 }
  );
}

/* ------------------------------------------------------------------
   PATCH – edit approved professional (unchanged)
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

    const professional: ProfessionalWithRelations =
      await prisma.professional.update({
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
      id: professional.id,
      name: professional.name,
      image: professional.image,
      location: professional.application?.user?.location || null,
      userId: professional.application?.userId || null,
      rating: professional.rating,
      reviewCount: professional.reviewCount,
      rate: professional.rate,
      biography: professional.biography,
      createdAt: professional.createdAt,
      venue: professional.venue,
    });
  } catch (error) {
    console.error("PATCH Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

/* ------------------------------------------------------------------
   DELETE – remove professional (unchanged)
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

    const professional = await prisma.professional.delete({
      where: { id },
      select: { id: true, name: true },
    });

    console.log("Professional deleted:", professional);
    return NextResponse.json({ message: "Professional deleted" });
  } catch (error) {
    console.error("DELETE Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
