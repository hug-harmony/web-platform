import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Validation schemas
const specialistApplicationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  location: z.string().min(1, "Location is required"),
  biography: z.string().min(1, "Biography is required"),
  education: z.string().min(1, "Education is required"),
  license: z.string().min(1, "License is required"),
  role: z.string().min(1, "Role is required"),
  tags: z.string().min(1, "Tags are required"),
});

const updateStatusSchema = z.object({
  status: z.enum(["pending", "reviewed", "approved", "rejected"]),
});

z;

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized: Admin access required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const status = searchParams.get("status") || "all";
    const search = searchParams.get("search") || "";

    if (id) {
      const application = await prisma.specialistApplication.findUnique({
        where: { id },
      });
      if (!application) {
        return NextResponse.json(
          { error: "Application not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(application);
    }

    const applications = await prisma.specialistApplication.findMany({
      where: {
        ...(status !== "all" && { status }),
        name: { contains: search, mode: "insensitive" },
        userId: { not: session.user.id }, // Exclude current user's application
      },
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(applications);
  } catch (error) {
    console.error("Error fetching applications:", error);
    return NextResponse.json(
      { error: "Internal server error: Failed to fetch applications" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized: Admin access required" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { id, status } = z
      .object({
        id: z.string(),
        status: z.enum(["pending", "reviewed", "approved", "rejected"]),
      })
      .parse(body);

    const application = await prisma.specialistApplication.findUnique({
      where: { id },
    });

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    let specialistId: string | null = null;
    if (status === "approved" && application.status !== "approved") {
      const specialist = await prisma.specialist.create({
        data: {
          name: application.name,
          location: application.location,
          biography: application.biography,
          education: application.education,
          license: application.license,
          role: application.role,
          tags: application.tags,
        },
      });
      specialistId = specialist.id;
    } else if (status === "rejected" && application.specialistId) {
      await prisma.specialist.delete({
        where: { id: application.specialistId },
      });
    }

    const updatedApplication = await prisma.specialistApplication.update({
      where: { id },
      data: {
        status,
        ...(specialistId && { specialistId }),
        ...(status === "rejected" && { specialistId: null }),
      },
    });

    return NextResponse.json(updatedApplication);
  } catch (error) {
    console.error("Error updating application:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error: Failed to update application" },
      { status: 500 }
    );
  }
}
