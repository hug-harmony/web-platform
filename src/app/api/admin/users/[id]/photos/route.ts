import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: userId } = await params;

    if (!userId) {
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

    // Fetch user photos
    const photos = await prisma.userPhoto.findMany({
      where: { userId },
      select: {
        id: true,
        url: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = photos.map((photo) => ({
      id: photo.id,
      url: photo.url,
      createdAt: photo.createdAt.toISOString(),
      uploadedAt: photo.createdAt.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    }));

    return NextResponse.json({
      data: formatted,
      total: formatted.length,
    });
  } catch (error) {
    console.error("GET /api/admin/users/[id]/photos error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: userId } = await params;
    const url = new URL(req.url);
    const photoId = url.searchParams.get("photoId");

    if (!userId || !photoId) {
      return NextResponse.json(
        { error: "Invalid user ID or photo ID" },
        { status: 400 }
      );
    }

    // Check if admin
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true },
    });

    if (!currentUser?.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify photo belongs to user
    const photo = await prisma.userPhoto.findUnique({
      where: { id: photoId },
      select: { userId: true },
    });

    if (!photo || photo.userId !== userId) {
      return NextResponse.json(
        { error: "Photo not found or does not belong to user" },
        { status: 404 }
      );
    }

    // Delete photo
    await prisma.userPhoto.delete({
      where: { id: photoId },
    });

    return NextResponse.json({
      message: "Photo deleted successfully",
      photoId,
    });
  } catch (error) {
    console.error("DELETE /api/admin/users/[id]/photos error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
