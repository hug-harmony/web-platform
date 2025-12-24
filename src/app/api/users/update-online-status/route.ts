// src/app/api/users/update-online-status/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    // Verify internal API key (for Lambda calls)
    const apiKey = request.headers.get("x-api-key");
    const internalKey = process.env.INTERNAL_API_KEY;

    // Allow if internal key matches OR if no internal key is configured (dev mode)
    if (internalKey && apiKey !== internalKey) {
      console.warn("Unauthorized attempt to update online status");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { userId, lastOnline } = body;

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const timestamp = lastOnline ? new Date(lastOnline) : new Date();

    // Update user's lastOnline timestamp
    await prisma.user.update({
      where: { id: userId },
      data: { lastOnline: timestamp },
    });

    console.log(
      `Updated lastOnline for user ${userId} to ${timestamp.toISOString()}`
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating online status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
