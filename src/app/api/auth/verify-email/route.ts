// app/api/auth/verify-email/route.ts

import { NextRequest, NextResponse } from "next/server";
import {
  validateVerificationToken,
  markEmailAsVerified,
} from "@/lib/services/verification-token";
import { sendWelcomeEmail } from "@/lib/services/email";

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        {
          error: "Verification token is required",
          code: "TOKEN_REQUIRED",
        },
        { status: 400 }
      );
    }

    const validation = await validateVerificationToken(token);

    if (!validation.valid) {
      return NextResponse.json(
        {
          error: validation.error || "Invalid token",
          code: "INVALID_TOKEN",
        },
        { status: 400 }
      );
    }

    // Mark email as verified
    await markEmailAsVerified(validation.userId!, token);

    // Send welcome email
    try {
      await sendWelcomeEmail(validation.email!, validation.firstName!);
    } catch (emailError) {
      console.error("Failed to send welcome email:", emailError);
      // Don't fail verification if welcome email fails
    }

    return NextResponse.json({
      message: "Email verified successfully",
      success: true,
    });
  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.json(
      {
        error: "Failed to verify email",
        code: "SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}
