/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { deleteFromS3ByUrl } from "@/lib/s3";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    // URL: /api/users/[id]/photos/[photoId]
    const photoId = pathParts[pathParts.length - 1];
    const userId = pathParts[pathParts.length - 3];

    if (!userId || !photoId) {
      return NextResponse.json({ error: "Invalid IDs" }, { status: 400 });
    }

    // Check authorization
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true },
    });
    if (!currentUser?.isAdmin && session.user.id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Find the photo
    const photo = await prisma.userPhoto.findUnique({
      where: { id: photoId },
      select: { id: true, url: true, userId: true },
    });

    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    if (photo.userId !== userId) {
      return NextResponse.json(
        { error: "Photo does not belong to this user" },
        { status: 403 }
      );
    }

    // Delete from S3 storage
    try {
      await deleteFromS3ByUrl(photo.url);
    } catch (s3Error) {
      console.error("Failed to delete from S3:", s3Error);
      // Continue with database deletion even if S3 deletion fails
    }

    // Delete from database
    await prisma.userPhoto.delete({
      where: { id: photoId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error("DELETE /users/[id]/photos/[photoId] error:", error);
    return NextResponse.json(
      { error: error.message || "Delete failed" },
      { status: 500 }
    );
  }
}
