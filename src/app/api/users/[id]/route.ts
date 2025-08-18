/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

// Validation schema for PATCH request
const updateUserSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  firstName: z.string().min(1, "First name is required").optional(),
  lastName: z.string().min(1, "Last name is required").optional(),
  phoneNumber: z.string().min(1, "Phone number is required").optional(),
  profileImage: z.string().url().nullable().optional(),
  location: z.string().min(1, "Location is required").optional(),
  status: z.enum(["active", "suspended"]).optional(),
});

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.pathname.split("/").pop();

    if (!id) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        profileImage: true,
        location: true,
        status: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: user.id,
      name:
        user.name ||
        (user.firstName && user.lastName
          ? `${user.firstName} ${user.lastName}`
          : "Unknown User"),
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      email: user.email,
      phoneNumber: user.phoneNumber || "",
      profileImage: user.profileImage || "",
      location: user.location || "",
      status: user.status,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error("GET /users/[id] error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const id = url.pathname.split("/").pop();

    if (!id) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    // Check if user is admin or updating their own profile
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true },
    });

    if (!currentUser?.isAdmin && session.user.id !== id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const validatedData = updateUserSchema.parse(body);

    // Fetch user with associated specialist application to check for specialist
    const user = await prisma.user.findUnique({
      where: { id },
      include: { specialistApplication: { include: { specialist: true } } },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prepare data for User update
    const userUpdateData = {
      name: validatedData.name,
      firstName: validatedData.firstName,
      lastName: validatedData.lastName,
      phoneNumber: validatedData.phoneNumber,
      profileImage: validatedData.profileImage,
      location: validatedData.location,
      status: validatedData.status,
    };

    // Prepare data for Specialist update (only if name or profileImage is provided)
    const specialistUpdateData = {
      ...(validatedData.name && { name: validatedData.name }),
      ...(validatedData.profileImage !== undefined && {
        image: validatedData.profileImage ?? undefined, // Convert null to undefined
      }),
    };

    // Update User and Specialist (if applicable) in a transaction
    const updatedRecords = await prisma.$transaction([
      // Update User
      prisma.user.update({
        where: { id },
        data: userUpdateData,
        select: {
          id: true,
          name: true,
          firstName: true,
          lastName: true,
          email: true,
          phoneNumber: true,
          profileImage: true,
          location: true,
          status: true,
        },
      }),
      // Update Specialist if it exists and name or profileImage is updated
      ...(user.specialistApplication?.specialist &&
      (validatedData.name || validatedData.profileImage !== undefined)
        ? [
            prisma.specialist.update({
              where: { id: user.specialistApplication.specialistId! }, // Non-null assertion since specialist exists
              data: specialistUpdateData,
            }),
          ]
        : []),
    ]);

    const updatedUser = updatedRecords[0];

    return NextResponse.json({
      id: updatedUser.id,
      name:
        updatedUser.name ||
        (updatedUser.firstName && updatedUser.lastName
          ? `${updatedUser.firstName} ${updatedUser.lastName}`
          : "Unknown User"),
      firstName: updatedUser.firstName || "",
      lastName: updatedUser.lastName || "",
      email: updatedUser.email,
      phoneNumber: updatedUser.phoneNumber || "",
      profileImage: updatedUser.profileImage || "",
      location: updatedUser.location || "",
      status: updatedUser.status,
    });
  } catch (error: any) {
    console.error("PATCH /users/[id] error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    if (error.message === "User not found") {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
