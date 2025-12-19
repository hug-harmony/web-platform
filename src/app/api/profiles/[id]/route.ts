// app/api/profiles/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getProfileById, recordProfileVisit } from "@/lib/services/profiles";

/**
 * GET /api/profiles/[id]
 *
 * Fetches a unified profile - automatically detects if it's a user or professional
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Validate ID format
    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    // Get the profile
    const profile = await getProfileById(id);

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Record the visit (async, don't wait)
    if (session.user.id !== id) {
      recordProfileVisit(session.user.id, id, profile.type).catch((err) => {
        console.error("Failed to record profile visit:", err);
      });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
