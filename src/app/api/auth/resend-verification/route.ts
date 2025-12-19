// app/api/auth/resend-verification/route.ts

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { resendVerificationSchema } from "@/lib/validations/auth";
import { sendVerificationEmail } from "@/lib/services/email";
import {
  createVerificationToken,
  canResendVerification,
} from "@/lib/services/verification-token";
import { checkRateLimit, getClientIp } from "@/lib/services/rate-limit";

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = getClientIp(request.headers);
    const rateLimit = await checkRateLimit(ip, "resend_verification");

    if (!rateLimit.allowed) {
      const resetMinutes = Math.ceil(
        (rateLimit.resetAt.getTime() - Date.now()) / 60000
      );
      return NextResponse.json(
        {
          error: `Too many requests. Please try again in ${resetMinutes} minutes.`,
          code: "RATE_LIMITED",
        },
        { status: 429 }
      );
    }

    const json = await request.json();
    const parsed = resendVerificationSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid email address",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    const { email } = parsed.data;

    // Find user - don't reveal if email exists
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        firstName: true,
        emailVerified: true,
      },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        message:
          "If an account exists with this email, a verification link has been sent.",
        success: true,
      });
    }

    // Check if already verified
    if (user.emailVerified) {
      return NextResponse.json({
        message: "Email is already verified",
        alreadyVerified: true,
        success: true,
      });
    }

    // Check cooldown
    const cooldownCheck = await canResendVerification(user.id);
    if (!cooldownCheck.canResend) {
      return NextResponse.json(
        {
          error: `Please wait ${cooldownCheck.remainingSeconds} seconds before requesting another verification email.`,
          code: "COOLDOWN",
          remainingSeconds: cooldownCheck.remainingSeconds,
        },
        { status: 429 }
      );
    }

    // Create new token and send email
    const { token } = await createVerificationToken(user.id);
    await sendVerificationEmail(email, token, user.firstName || "User");

    return NextResponse.json({
      message:
        "If an account exists with this email, a verification link has been sent.",
      success: true,
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    return NextResponse.json(
      {
        error: "Failed to send verification email",
        code: "SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}
