/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { Prisma } from "@prisma/client";

// Validation schema for updating specialist data
const updateSpecialistSchema = z.object({
  biography: z.string().min(1, "Biography is required").optional(),
  location: z.string().min(1, "Location is required").optional(),
  rate: z.number().nullable().optional(),
});

type SpecialistWithRelations = Prisma.SpecialistGetPayload<{
  select: {
    id: true;
    name: true;
    biography: true;
    rate: true;
    createdAt: true;
    application: {
      select: {
        user: { select: { location: true } };
      };
    };
    discounts: {
      select: {
        id: true;
        name: true;
        rate: true;
        discount: true;
        createdAt: true;
        updatedAt: true;
      };
      orderBy: { createdAt: "desc" };
    };
  };
}>;

type UpdatedSpecialistWithRelations = Prisma.SpecialistGetPayload<{
  select: {
    id: true;
    name: true;
    biography: true;
    rate: true;
    application: {
      select: {
        user: { select: { location: true } };
      };
    };
  };
}>;

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized: No session found" },
        { status: 401 }
      );
    }

    const params = await context.params;
    const id = params.id;

    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
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
          biography: true,
          rate: true,
          createdAt: true,
          application: {
            select: {
              userId: true,
              user: { select: { location: true } },
            },
          },
          discounts: {
            select: {
              id: true,
              name: true,
              rate: true,
              discount: true,
              createdAt: true,
              updatedAt: true,
            },
            orderBy: { createdAt: "desc" },
          },
        },
      });

    if (!specialist) {
      return NextResponse.json(
        { error: "Specialist not found" },
        { status: 404 }
      );
    }

    // Compute metrics
    const completedAppointments = await prisma.appointment.findMany({
      where: {
        specialistId: id,
        payment: { status: "successful" },
      },
      select: {
        payment: {
          select: { amount: true },
        },
      },
    });

    const completedSessions = completedAppointments.length;
    const totalEarnings = completedAppointments.reduce(
      (sum, appt) => sum + (appt.payment?.amount || 0),
      0
    );

    const setting = await prisma.companySettings.findUnique({
      where: { key: "companyCutPercentage" },
    });
    const companyCutPercentage = setting ? setting.value : 20;

    return NextResponse.json({
      id: specialist.id,
      name: specialist.name || "Unknown Specialist",
      biography: specialist.biography || "",
      location: specialist.application?.user?.location || "",
      rate: specialist.rate || null,
      createdAt: specialist.createdAt,
      discounts: specialist.discounts.map((discount) => ({
        id: discount.id,
        name: discount.name,
        rate: discount.rate,
        discount: discount.discount,
        createdAt: discount.createdAt,
        updatedAt: discount.updatedAt,
      })),
      metrics: {
        totalEarnings,
        companyCutPercentage,
        completedSessions,
        hourlyRate: specialist.rate || 0,
      },
    });
  } catch (error: any) {
    console.error("Error fetching specialist:", error);
    return NextResponse.json(
      { error: "Internal server error: Failed to fetch specialist" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized: No session found" },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const id = url.pathname.split("/").pop();

    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return NextResponse.json(
        { error: "Invalid specialist ID" },
        { status: 400 }
      );
    }

    // Check if the user is the specialist
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

    const body = await req.json();
    const validatedData = updateSpecialistSchema.parse(body);

    // Update Specialist model
    const updatedSpecialist: UpdatedSpecialistWithRelations =
      await prisma.specialist.update({
        where: { id },
        data: {
          biography: validatedData.biography,
          rate: validatedData.rate,
        },
        select: {
          id: true,
          name: true,
          biography: true,
          rate: true,
          application: {
            select: {
              user: { select: { location: true } },
            },
          },
        },
      });

    // Update location in the associated User model if provided
    if (validatedData.location) {
      await prisma.user.update({
        where: { id: application.userId },
        data: { location: validatedData.location },
      });
    }

    return NextResponse.json({
      id: updatedSpecialist.id,
      name: updatedSpecialist.name || "Unknown Specialist",
      biography: updatedSpecialist.biography || "",
      location: updatedSpecialist.application?.user?.location || "",
      rate: updatedSpecialist.rate || null,
    });
  } catch (error: any) {
    console.error("Error updating specialist:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "Specialist not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error: Failed to update specialist" },
      { status: 500 }
    );
  }
}
