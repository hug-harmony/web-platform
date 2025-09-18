/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

// Validation schema for updating specialist data
const updateSpecialistSchema = z.object({
  role: z.string().min(1, "Role is required").optional(),
  tags: z.string().min(1, "Tags are required").optional(),
  biography: z.string().min(1, "Biography is required").optional(),
  education: z.string().min(1, "Education is required").optional(),
  license: z.string().min(1, "License is required").optional(),
  location: z.string().min(1, "Location is required").optional(),
  rate: z.number().nullable().optional(),
});

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

    const specialist = await prisma.specialist.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        role: true,
        tags: true,
        biography: true,
        education: true,
        license: true,
        location: true,
        rate: true,
        createdAt: true,
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
      role: specialist.role || "",
      tags: specialist.tags || "",
      biography: specialist.biography || "",
      education: specialist.education || "",
      license: specialist.license || "",
      location: specialist.location || "",
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

    const body = await req.json();
    const validatedData = updateSpecialistSchema.parse(body);

    // Update the Specialist model
    const updatedSpecialist = await prisma.specialist.update({
      where: { id },
      data: {
        role: validatedData.role,
        tags: validatedData.tags,
        biography: validatedData.biography,
        education: validatedData.education,
        license: validatedData.license,
        location: validatedData.location,
        rate: validatedData.rate,
      },
      select: {
        id: true,
        name: true,
        role: true,
        tags: true,
        biography: true,
        education: true,
        license: true,
        location: true,
        rate: true,
      },
    });

    return NextResponse.json({
      id: updatedSpecialist.id,
      name: updatedSpecialist.name || "Unknown Specialist",
      role: updatedSpecialist.role || "",
      tags: updatedSpecialist.tags || "",
      biography: updatedSpecialist.biography || "",
      education: updatedSpecialist.education || "",
      license: updatedSpecialist.license || "",
      location: updatedSpecialist.location || "",
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
