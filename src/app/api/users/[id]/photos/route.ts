/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { uploadToS3 } from "@/lib/s3";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_PHOTOS = 10;

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const id = pathParts[pathParts.length - 2];

    if (!id) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const photos = await prisma.userPhoto.findMany({
      where: { userId: id },
      select: {
        id: true,
        url: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      photos: photos.map((photo) => ({
        id: photo.id,
        url: photo.url,
        createdAt: photo.createdAt,
      })),
    });
  } catch (error) {
    console.error("GET /users/[id]/photos error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const id = pathParts[pathParts.length - 2];

    if (!id) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    // Check authorization
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true },
    });
    if (!currentUser?.isAdmin && session.user.id !== id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const formData = await req.formData();
    const files = formData.getAll("photos") as File[];

    if (!files.length || files.some((f) => !(f instanceof File))) {
      return NextResponse.json(
        { error: "No valid files uploaded" },
        { status: 400 }
      );
    }

    // Validate each file
    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        return NextResponse.json(
          { error: `${file.name} is not an image` },
          { status: 400 }
        );
      }
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `${file.name} exceeds 5MB limit` },
          { status: 400 }
        );
      }
    }

    // Check total photo count
    const existingCount = await prisma.userPhoto.count({
      where: { userId: id },
    });

    if (existingCount + files.length > MAX_PHOTOS) {
      return NextResponse.json(
        {
          error: `Maximum ${MAX_PHOTOS} photos allowed. You have ${existingCount} photos.`,
        },
        { status: 400 }
      );
    }

    // Upload files and create records
    const uploaded = await Promise.all(
      files.map(async (file) => {
        const extension = file.name.split(".").pop() || "jpg";
        const key = `users/${id}/${crypto.randomUUID()}.${extension}`;

        const { url: s3Url } = await uploadToS3(file, key, file.type);

        const photo = await prisma.userPhoto.create({
          data: {
            userId: id,
            url: s3Url,
          },
          select: {
            id: true,
            url: true,
            createdAt: true,
          },
        });

        return {
          id: photo.id,
          url: photo.url,
          createdAt: photo.createdAt,
        };
      })
    );

    return NextResponse.json({ photos: uploaded });
  } catch (error: any) {
    console.error("POST /users/[id]/photos error:", error);
    return NextResponse.json(
      { error: error.message || "Upload failed" },
      { status: 500 }
    );
  }
}
