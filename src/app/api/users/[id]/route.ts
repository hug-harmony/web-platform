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
  location: z
    .string()
    .max(100, "Location must be 100 characters or less")
    .optional(),
  biography: z
    .string()
    .max(500, "Biography must be 500 characters or less")
    .optional(),
  relationshipStatus: z
    .string()
    .max(50, "Relationship status must be 50 characters or less")
    .optional(),
  orientation: z
    .string()
    .max(50, "Orientation must be 50 characters or less")
    .optional(),
  height: z.string().max(20, "Height must be 20 characters or less").optional(),
  ethnicity: z
    .string()
    .max(50, "Ethnicity must be 50 characters or less")
    .optional(),
  zodiacSign: z
    .string()
    .max(20, "Zodiac sign must be 20 characters or less")
    .optional(),
  favoriteColor: z
    .string()
    .max(30, "Favorite color must be 30 characters or less")
    .optional(),
  favoriteMedia: z
    .string()
    .max(100, "Favorite movie/TV show must be 100 characters or less")
    .optional(),
  petOwnership: z
    .string()
    .max(50, "Pet ownership must be 50 characters or less")
    .optional(),
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
        heardFrom: true,
        heardFromOther: true,
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
      heardFrom: user.heardFrom || null,
      heardFromOther: user.heardFromOther || null,
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
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = new URL(req.url).pathname.split("/").pop();
    if (!id) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true },
    });
    if (!currentUser?.isAdmin && session.user.id !== id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const validatedData = updateUserSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { id },
      include: { specialistApplication: { include: { specialist: true } } },
    });
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    // === USER UPDATE DATA ===
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
    if (validatedData.location)
      userUpdateData.location = validatedData.location;
    if (validatedData.biography)
      userUpdateData.biography = validatedData.biography;
    if (validatedData.relationshipStatus)
      userUpdateData.relationshipStatus = validatedData.relationshipStatus;
    if (validatedData.orientation)
      userUpdateData.orientation = validatedData.orientation;
    if (validatedData.height) userUpdateData.height = validatedData.height;
    if (validatedData.ethnicity)
      userUpdateData.ethnicity = validatedData.ethnicity;
    if (validatedData.zodiacSign)
      userUpdateData.zodiacSign = validatedData.zodiacSign;
    if (validatedData.favoriteColor)
      userUpdateData.favoriteColor = validatedData.favoriteColor;
    if (validatedData.favoriteMedia)
      userUpdateData.favoriteMedia = validatedData.favoriteMedia;
    if (validatedData.petOwnership)
      userUpdateData.petOwnership = validatedData.petOwnership;
    if (validatedData.status) userUpdateData.status = validatedData.status;

    // === UPDATE USER ===
    const updatedUser = await prisma.user.update({
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
      },
    });

    // === UPDATE SPECIALIST (AFTER USER) ===
    const hasSpecialistUpdates =
      validatedData.name ||
      validatedData.profileImage !== undefined ||
      validatedData.biography ||
      validatedData.location;

    if (user.specialistApplication?.specialist && hasSpecialistUpdates) {
      const specialistUpdate: any = {};
      if (validatedData.name) specialistUpdate.name = validatedData.name;
      if (validatedData.profileImage !== undefined)
        specialistUpdate.image = validatedData.profileImage;
      if (validatedData.biography)
        specialistUpdate.biography = validatedData.biography;
      if (validatedData.location)
        specialistUpdate.location = validatedData.location;

      await prisma.specialist.update({
        where: { id: user.specialistApplication.specialistId! },
        data: specialistUpdate,
      });
    }

    // === RETURN RESPONSE ===
    return NextResponse.json({
      id: updatedUser.id,
      name:
        updatedUser.name ||
        `${updatedUser.firstName} ${updatedUser.lastName}`.trim() ||
        "User",
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
    });
  } catch (error: any) {
    console.error("PATCH /users/[id] error:", error);
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: error.errors }, { status: 400 });
    return NextResponse.json(
      { error: error.message || "Update failed" },
      { status: 500 }
    );
  }
}
