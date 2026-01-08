// src\app\api\admin\users\[id]\route.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

const updateUserSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  firstName: z.string().min(1, "First name is required").optional(),
  lastName: z.string().min(1, "Last name is required").optional(),
  phoneNumber: z.string().min(1, "Phone number is required").optional(),
  profileImage: z.string().url().nullable().optional(),
  location: z
    .string()
    .max(100, "Location must be 100 characters or less")
    .nullish()
    .transform((val) => val || null),
  biography: z
    .string()
    .max(500, "Biography must be 500 characters or less")
    .nullish()
    .transform((val) => val || null),
  relationshipStatus: z
    .string()
    .max(50, "Relationship status must be 50 characters or less")
    .nullish()
    .transform((val) => val || null),
  orientation: z
    .string()
    .max(50, "Orientation must be 50 characters or less")
    .nullish()
    .transform((val) => val || null),
  height: z
    .string()
    .max(20, "Height must be 20 characters or less")
    .nullish()
    .transform((val) => val || null),
  ethnicity: z
    .string()
    .max(50, "Ethnicity must be 50 characters or less")
    .nullish()
    .transform((val) => val || null),
  zodiacSign: z
    .string()
    .max(20, "Zodiac sign must be 20 characters or less")
    .nullish()
    .transform((val) => val || null),
  favoriteColor: z
    .string()
    .max(30, "Favorite color must be 30 characters or less")
    .nullish()
    .transform((val) => val || null),
  favoriteMedia: z
    .string()
    .max(100, "Favorite movie/TV show must be 100 characters or less")
    .nullish()
    .transform((val) => val || null),
  petOwnership: z
    .string()
    .max(50, "Pet ownership must be 50 characters or less")
    .nullish()
    .transform((val) => val || null),
  status: z.enum(["active", "suspended"]).optional(),
});

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const id = url.pathname.split("/").pop();

    if (!id) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    // Check if admin
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true },
    });

    if (!currentUser?.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        username: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        profileImage: true,
        lastOnline: true,
        location: true,
        biography: true,
        relationshipStatus: true,
        orientation: true,
        height: true,
        ethnicity: true,
        zodiacSign: true,
        favoriteColor: true,
        favoriteMedia: true,
        petOwnership: true,
        status: true,
        createdAt: true,
        emailVerified: true,
        isAdmin: true,
        heardFrom: true,
        heardFromOther: true,
        professionalApplication: {
          select: {
            status: true,
            professionalId: true,
          },
        },
        _count: {
          select: {
            appointments: true,
            posts: true,
            conversations1: true,
            conversations2: true,
            reports: true,
            profileVisits: true,
            reviews: true,
            surveyResponses: true,
          },
        },
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
      username: user.username || null,
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      email: user.email,
      phoneNumber: user.phoneNumber || "",
      profileImage: user.profileImage || "",
      lastOnline: user.lastOnline || null,
      location: user.location || "",
      biography: user.biography || "",
      relationshipStatus: user.relationshipStatus || "",
      orientation: user.orientation || "",
      height: user.height || "",
      ethnicity: user.ethnicity || "",
      zodiacSign: user.zodiacSign || "",
      favoriteColor: user.favoriteColor || "",
      favoriteMedia: user.favoriteMedia || "",
      petOwnership: user.petOwnership || "",
      status: user.status,
      createdAt: user.createdAt,
      emailVerified: user.emailVerified,
      isAdmin: user.isAdmin,
      heardFrom: user.heardFrom || null,
      heardFromOther: user.heardFromOther || null,
      professionalApplication: {
        status: user.professionalApplication?.status || null,
        professionalId: user.professionalApplication?.professionalId || null,
      },
      stats: {
        totalAppointments: user._count.appointments,
        totalPosts: user._count.posts,
        conversationsCount:
          user._count.conversations1 + user._count.conversations2,
        reportsSubmitted: user._count.reports,
        profileVisits: user._count.profileVisits,
        reviewsGiven: user._count.reviews,
        surveyResponses: user._count.surveyResponses,
      },
    });
  } catch (error) {
    console.error("GET /api/admin/users/[id] error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = new URL(req.url).pathname.split("/").pop();
    if (!id) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true },
    });

    if (!currentUser?.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const validatedData = updateUserSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { id },
      include: { professionalApplication: { include: { professional: true } } },
    });

    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Build update data
    const userUpdateData: any = {};

    if (validatedData.name) userUpdateData.name = validatedData.name;
    if (validatedData.firstName)
      userUpdateData.firstName = validatedData.firstName;
    if (validatedData.lastName)
      userUpdateData.lastName = validatedData.lastName;
    if (validatedData.phoneNumber)
      userUpdateData.phoneNumber = validatedData.phoneNumber;
    if (validatedData.profileImage !== undefined)
      userUpdateData.profileImage = validatedData.profileImage;
    if (validatedData.location !== undefined)
      userUpdateData.location = validatedData.location;
    if (validatedData.biography !== undefined)
      userUpdateData.biography = validatedData.biography;
    if (validatedData.relationshipStatus !== undefined)
      userUpdateData.relationshipStatus = validatedData.relationshipStatus;
    if (validatedData.orientation !== undefined)
      userUpdateData.orientation = validatedData.orientation;
    if (validatedData.height !== undefined)
      userUpdateData.height = validatedData.height;
    if (validatedData.ethnicity !== undefined)
      userUpdateData.ethnicity = validatedData.ethnicity;
    if (validatedData.zodiacSign !== undefined)
      userUpdateData.zodiacSign = validatedData.zodiacSign;
    if (validatedData.favoriteColor !== undefined)
      userUpdateData.favoriteColor = validatedData.favoriteColor;
    if (validatedData.favoriteMedia !== undefined)
      userUpdateData.favoriteMedia = validatedData.favoriteMedia;
    if (validatedData.petOwnership !== undefined)
      userUpdateData.petOwnership = validatedData.petOwnership;
    if (validatedData.status) userUpdateData.status = validatedData.status;

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: userUpdateData,
      select: {
        id: true,
        name: true,
        username: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        profileImage: true,
        location: true,
        biography: true,
        relationshipStatus: true,
        orientation: true,
        height: true,
        ethnicity: true,
        zodiacSign: true,
        favoriteColor: true,
        favoriteMedia: true,
        petOwnership: true,
        status: true,
        createdAt: true,
        lastOnline: true,
        emailVerified: true,
      },
    });

    // Update professional if exists
    const hasProfessionalUpdates =
      validatedData.name ||
      validatedData.profileImage !== undefined ||
      validatedData.biography ||
      validatedData.location;

    if (user.professionalApplication?.professional && hasProfessionalUpdates) {
      const professionalUpdate: any = {};
      if (validatedData.name) professionalUpdate.name = validatedData.name;
      if (validatedData.profileImage !== undefined)
        professionalUpdate.image = validatedData.profileImage;
      if (validatedData.biography)
        professionalUpdate.biography = validatedData.biography;
      if (validatedData.location)
        professionalUpdate.location = validatedData.location;

      await prisma.professional.update({
        where: { id: user.professionalApplication.professionalId! },
        data: professionalUpdate,
      });
    }

    return NextResponse.json({
      id: updatedUser.id,
      name:
        updatedUser.name ||
        `${updatedUser.firstName} ${updatedUser.lastName}`.trim() ||
        "User",
      username: updatedUser.username || null,
      firstName: updatedUser.firstName || "",
      lastName: updatedUser.lastName || "",
      email: updatedUser.email,
      phoneNumber: updatedUser.phoneNumber || "",
      profileImage: updatedUser.profileImage || "",
      location: updatedUser.location || "",
      biography: updatedUser.biography || "",
      relationshipStatus: updatedUser.relationshipStatus || "",
      orientation: updatedUser.orientation || "",
      height: updatedUser.height || "",
      ethnicity: updatedUser.ethnicity || "",
      zodiacSign: updatedUser.zodiacSign || "",
      favoriteColor: updatedUser.favoriteColor || "",
      favoriteMedia: updatedUser.favoriteMedia || "",
      petOwnership: updatedUser.petOwnership || "",
      status: updatedUser.status,
      createdAt: updatedUser.createdAt,
      lastOnline: updatedUser.lastOnline,
      emailVerified: updatedUser.emailVerified,
    });
  } catch (error: any) {
    console.error("PATCH /api/admin/users/[id] error:", error);
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: error.errors }, { status: 400 });
    return NextResponse.json(
      { error: error.message || "Update failed" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = new URL(req.url).pathname.split("/").pop();
    if (!id) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    // Only admins can delete users
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true },
    });

    if (!currentUser?.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Soft delete by setting status to suspended
    const deletedUser = await prisma.user.update({
      where: { id },
      data: { status: "suspended" },
    });

    return NextResponse.json({
      message: "User suspended",
      user: { id: deletedUser.id, status: deletedUser.status },
    });
  } catch (error) {
    console.error("DELETE /api/admin/users/[id] error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
