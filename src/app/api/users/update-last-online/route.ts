// src/app/api/users/update-last-online/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();

    // Update user's lastOnline timestamp
    await prisma.user.update({
      where: { id: session.user.id },
      data: { lastOnline: now },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating last online:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
