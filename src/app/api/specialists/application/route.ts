/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Validation schemas
const specialistApplicationSchema = z.object({
  biography: z.string().min(1, "Biography is required"),
  rate: z
    .string()
    .transform((val) => parseFloat(val))
    .refine((val) => !isNaN(val) && val >= 0, {
      message: "Rate must be a valid non-negative number",
    }),
});

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
        biography: validatedData.biography,
        rate: validatedData.rate,
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
        include: { user: true },
      });
      if (!application) {
        return NextResponse.json(
          { error: "Application not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({
        ...application,
        name: application.user.name,
      });
    }

    const applications = await prisma.specialistApplication.findMany({
      where: {
        ...(status !== "all" && { status }),
        user: { name: { contains: search, mode: "insensitive" } },
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        user: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const formattedApplications = applications.map((app) => ({
      id: app.id,
      name: app.user.name || "Unknown",
      status: app.status,
      createdAt: app.createdAt,
    }));

    return NextResponse.json(formattedApplications);
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
        include: { user: true },
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
          if (!application.user.name) {
            throw new Error("User must have a name to become a specialist");
          }
          const specialist = await tx.specialist.create({
            data: {
              name: application.user.name,
              biography: application.biography,
              rate: application.rate,
              image: application.user.profileImage || null,
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
      return { ...updated, name: application.user.name };
    });

    return NextResponse.json(updatedApplication);
  } catch (error: any) {
    console.error("Error updating application:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    if (
      error.message === "Application not found" ||
      error.message === "User must have a name to become a specialist"
    ) {
      return NextResponse.json({ error: error.message }, { status: 404 });
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
