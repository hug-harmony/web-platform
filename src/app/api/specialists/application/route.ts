/* eslint-disable @typescript-eslint/no-explicit-any */
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

<<<<<<< HEAD
const updateStatusSchema = z.object({
  status: z.enum(["pending", "reviewed", "approved", "rejected"]),
});

z;
=======
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized: No session found" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validatedData = specialistApplicationSchema.parse(body);
    console.log("Received application data:", validatedData);

    // Use a transaction to ensure atomic cleanup and creation
    const application = await prisma.$transaction(async (tx) => {
      // Check for existing application
      const existingApplication = await tx.specialistApplication.findFirst({
        where: { userId: session.user.id },
        select: { id: true, status: true, specialistId: true },
      });

      console.log("Existing application for user:", {
        userId: session.user.id,
        application: existingApplication,
      });

      if (
        existingApplication &&
        ["pending", "reviewed", "approved"].includes(existingApplication.status)
      ) {
        throw new Error(
          "You already have a pending, reviewed, or approved application"
        );
      }

      // Clean up any existing application
      if (existingApplication) {
        console.log("Cleaning up existing application:", {
          id: existingApplication.id,
          status: existingApplication.status,
          specialistId: existingApplication.specialistId,
        });
        if (existingApplication.specialistId) {
          console.log(
            "Deleting associated specialist:",
            existingApplication.specialistId
          );
          await tx.specialist.deleteMany({
            where: { id: existingApplication.specialistId },
          });
        }
        await tx.specialistApplication.deleteMany({
          where: { id: existingApplication.id },
        });
        console.log("Existing application deleted:", existingApplication.id);
      }

      // Check for any conflicting specialistId records
      const conflictingApplications = await tx.specialistApplication.findMany({
        where: { specialistId: { not: null } },
        select: { id: true, userId: true, specialistId: true },
      });
      console.log(
        "Applications with non-null specialistId:",
        conflictingApplications
      );

      // Create new application without specialistId
      console.log("Creating new application for user:", session.user.id);
      const createData = {
        userId: session.user.id,
        name: validatedData.name,
        location: validatedData.location,
        biography: validatedData.biography,
        education: validatedData.education,
        license: validatedData.license,
        role: validatedData.role,
        tags: validatedData.tags,
        status: "pending",
      };
      console.log("Data sent to create SpecialistApplication:", createData);

      const newApplication = await tx.specialistApplication.create({
        data: createData,
      });

      console.log("New application created:", {
        id: newApplication.id,
        userId: newApplication.userId,
        specialistId: newApplication.specialistId,
      });
      return newApplication;
    });

    return NextResponse.json(application, { status: 201 });
  } catch (error: any) {
    console.error("Error submitting application:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    if (error.message?.includes("You already have a pending")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error.code === "P2002") {
      console.error("Unique constraint violation details:", error.meta);
      const allApplications = await prisma.specialistApplication.findMany({
        select: { id: true, userId: true, specialistId: true },
      });
      console.log("All SpecialistApplication records:", allApplications);
      return NextResponse.json(
        { error: "An application with this specialist ID already exists" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error: Failed to submit application" },
      { status: 500 }
    );
  }
}
>>>>>>> d02a3afb20c64babde9b3637615fff64d6d08f7c

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
        userId: { not: session.user.id },
      },
      select: { id: true, name: true, status: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(applications);
  } catch (error: any) {
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

    const updatedApplication = await prisma.$transaction(async (tx) => {
      const application = await tx.specialistApplication.findUnique({
        where: { id },
      });

      if (!application) {
        throw new Error("Application not found");
      }

      console.log("Processing application update:", {
        id,
        status,
        specialistId: application.specialistId,
      });

      if (status === "rejected") {
        if (application.specialistId) {
          console.log(
            "Deleting specialist for rejected application:",
            application.specialistId
          );
          await tx.specialist.deleteMany({
            where: { id: application.specialistId },
          });
        }
        await tx.specialistApplication.deleteMany({
          where: { id },
        });
        console.log("Application deleted on rejection:", id);
        return { ...application, status: "rejected", specialistId: null };
      }

      let specialistId: string | null = application.specialistId;
      if (status === "approved" && application.status !== "approved") {
        if (!application.specialistId) {
          console.log(
            "Creating new specialist for application:",
            application.id
          );
          const specialist = await tx.specialist.create({
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
          console.log("New specialist created:", specialistId);
        }
      }

      const updated = await tx.specialistApplication.update({
        where: { id },
        data: { status, specialistId },
      });

      console.log("Application updated:", {
        id: updated.id,
        status: updated.status,
        specialistId: updated.specialistId,
      });
      return updated;
    });

    return NextResponse.json(updatedApplication);
  } catch (error: any) {
    console.error("Error updating application:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    if (error.message === "Application not found") {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }
    if (error.code === "P2002") {
      console.error("Unique constraint violation details:", error.meta);
      return NextResponse.json(
        { error: "A specialist with this ID already exists" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error: Failed to update application" },
      { status: 500 }
    );
  }
}
