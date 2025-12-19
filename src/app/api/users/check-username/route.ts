// app/api/users/check-username/route.ts

import { NextRequest, NextResponse } from "next/server";
import {
  isUsernameAvailable,
  generateUsernameCandidates,
  filterAvailableUsernames,
} from "@/lib/services/username";
import { usernameSchema } from "@/lib/validations/auth";

export async function GET(request: NextRequest) {
  try {
    const username = request.nextUrl.searchParams.get("username");

    if (!username) {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 }
      );
    }

    // Validate username format
    const validation = usernameSchema.safeParse(username);
    if (!validation.success) {
      return NextResponse.json(
        {
          available: false,
          error:
            validation.error.errors[0]?.message || "Invalid username format",
        },
        { status: 200 }
      );
    }

    const available = await isUsernameAvailable(username);

    if (available) {
      return NextResponse.json({ available: true });
    }

    // Generate suggestions if not available
    const candidates = generateUsernameCandidates(username);
    const suggestions = await filterAvailableUsernames(candidates);

    return NextResponse.json({
      available: false,
      suggestions: suggestions.slice(0, 5),
    });
  } catch (error) {
    console.error("Check username error:", error);
    return NextResponse.json(
      { error: "Failed to check username" },
      { status: 500 }
    );
  }
}
