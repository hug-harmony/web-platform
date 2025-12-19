// app/api/auth/reset-password/route.ts

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { sendPasswordResetEmail } from "@/lib/services/email";
import { checkRateLimit, getClientIp } from "@/lib/services/rate-limit";
import { passwordSchema } from "@/lib/validations/auth";

/* ---------- POST: request reset (email OR phone) ---------- */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = getClientIp(request.headers);
    const rateLimit = await checkRateLimit(ip, "password_reset");

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

    const body = await request.json();
    const { email, phone } = body;

    if (!email && !phone) {
      return NextResponse.json(
        { error: "Email or phone number required" },
        { status: 400 }
      );
    }

    let user: {
      id: string;
      email: string;
      firstName: string | null;
      googleId: string | null;
      appleId: string | null;
      facebookId: string | null;
      password: string | null;
    } | null = null;

    if (email) {
      user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          firstName: true,
          googleId: true,
          appleId: true,
          facebookId: true,
          password: true,
        },
      });
    } else {
      const p = parsePhoneNumberFromString(phone);
      if (!p?.isValid()) {
        return NextResponse.json(
          { error: "Invalid phone number" },
          { status: 400 }
        );
      }
      const e164 = p.number;
      user = await prisma.user.findFirst({
        where: { phoneNumber: e164 },
        select: {
          id: true,
          email: true,
          firstName: true,
          googleId: true,
          appleId: true,
          facebookId: true,
          password: true,
        },
      });
    }

    // Always return success message to prevent enumeration
    const successMessage = "If the account exists, a reset link was sent.";

    // If user doesn't exist or is OAuth-only, return success without action
    if (!user) {
      return NextResponse.json({ message: successMessage }, { status: 200 });
    }

    // Check if user is OAuth-only (no password set)
    const isOAuthOnly =
      (user.googleId || user.appleId || user.facebookId) && !user.password;
    if (isOAuthOnly) {
      return NextResponse.json({ message: successMessage }, { status: 200 });
    }

    // Generate token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Upsert token (replace existing if any)
    await prisma.passwordResetToken.upsert({
      where: { userId: user.id },
      update: { token, expiresAt },
      create: { userId: user.id, token, expiresAt },
    });

    // Send email
    await sendPasswordResetEmail(user.email, token, user.firstName || "User");

    return NextResponse.json({ message: successMessage }, { status: 200 });
  } catch (err) {
    console.error("Reset request error:", err);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}

/* ---------- PUT: apply new password ---------- */
export async function PUT(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token and password required" },
        { status: 400 }
      );
    }

    // Validate password
    const passwordValidation = passwordSchema.safeParse(password);
    if (!passwordValidation.success) {
      return NextResponse.json(
        {
          error: "Password does not meet requirements",
          details: passwordValidation.error.format(),
        },
        { status: 400 }
      );
    }

    // Find valid token
    const rec = await prisma.passwordResetToken.findFirst({
      where: {
        token,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!rec) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 400 }
      );
    }

    // Update password (plain text as requested - no hashing)
    await prisma.$transaction([
      prisma.user.update({
        where: { id: rec.userId },
        data: {
          password,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      }),
      prisma.passwordResetToken.delete({ where: { id: rec.id } }),
    ]);

    return NextResponse.json(
      { message: "Password reset successfully" },
      { status: 200 }
    );
  } catch (err) {
    console.error("Reset apply error:", err);
    return NextResponse.json(
      { error: "Failed to reset password" },
      { status: 500 }
    );
  }
}
