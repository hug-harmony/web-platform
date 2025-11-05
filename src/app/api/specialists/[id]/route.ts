/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

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

// ✅ CORRECTED: Next.js 15+ signature
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized: No session found" },
        { status: 401 }
      );
    }

    const { id } = params; // Direct access

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
    const companyCutPercentage = setting ? Number(setting.value) : 20;

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
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ✅ CORRECTED: PATCH with modern signature
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;
  if (!id) {
    return NextResponse.json(
      { error: "Missing specialist ID" },
      { status: 400 }
    );
  }

  // Verify ownership
  const app = await prisma.specialistApplication.findFirst({
    where: {
      specialistId: id,
      userId: session.user.id,
    },
    select: {
      status: true,
      specialistId: true,
    },
  });

  if (!app || app.status !== "APPROVED") {
    return NextResponse.json(
      { error: "Forbidden: Not an approved specialist" },
      { status: 403 }
    );
  }

  // Parse body
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { biography, rate, venue } = body;

  // Validation
  if (
    biography !== undefined &&
    (typeof biography !== "string" || biography.length > 500)
  ) {
    return NextResponse.json(
      { error: "Biography must be ≤ 500 chars" },
      { status: 400 }
    );
  }
  if (rate !== undefined && (isNaN(rate) || rate <= 0 || rate > 10000)) {
    return NextResponse.json(
      { error: "Rate must be 0.01–10,000" },
      { status: 400 }
    );
  }
  if (venue !== undefined && !["host", "visit", "both"].includes(venue)) {
    return NextResponse.json({ error: "Invalid venue" }, { status: 400 });
  }

  // Update
  try {
    const updated = await prisma.specialist.update({
      where: { id },
      data: {
        biography: biography ?? undefined,
        rate: rate ?? undefined,
        venue: venue ?? undefined,
      },
      select: {
        id: true,
        biography: true,
        rate: true,
        venue: true,
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Error updating specialist:", err);
    return NextResponse.json(
      { error: "Failed to update specialist" },
      { status: 500 }
    );
  }
}
