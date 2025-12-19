// app/api/auth/register/route.ts

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { registerApiSchema, RESERVED_USERNAMES } from "@/lib/validations/auth";
import { sendVerificationEmail } from "@/lib/services/email";
import { createVerificationToken } from "@/lib/services/verification-token";
import {
  generateUsernameCandidates,
  filterAvailableUsernames,
} from "@/lib/services/username";
import { checkRateLimit, getClientIp } from "@/lib/services/rate-limit";

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = getClientIp(request.headers);
    const rateLimit = await checkRateLimit(ip, "register");

    if (!rateLimit.allowed) {
      const resetMinutes = Math.ceil(
        (rateLimit.resetAt.getTime() - Date.now()) / 60000
      );
      return NextResponse.json(
        {
          error: `Too many registration attempts. Please try again in ${resetMinutes} minutes.`,
          code: "RATE_LIMITED",
        },
        { status: 429 }
      );
    }

    const json = await request.json();
    const parsed = registerApiSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          code: "VALIDATION_ERROR",
          details: parsed.error.format(),
        },
        { status: 400 }
      );
    }

    const {
      username,
      email,
      password,
      firstName,
      lastName,
      phoneNumber: rawPhoneNumber,
      ageVerification,
      heardFrom,
      heardFromOther,
    } = parsed.data;

    // Age verification check
    if (!ageVerification) {
      return NextResponse.json(
        {
          error: "You must confirm you are over 18 and agree to the terms",
          code: "AGE_VERIFICATION_REQUIRED",
        },
        { status: 400 }
      );
    }

    // Validate heardFromOther if "Other" selected
    if (heardFrom === "Other" && !heardFromOther?.trim()) {
      return NextResponse.json(
        {
          error: "Please specify how you heard about us",
          code: "HEARD_FROM_REQUIRED",
        },
        { status: 400 }
      );
    }

    const lower = username.toLowerCase();

    // Check reserved usernames
    if (RESERVED_USERNAMES.has(lower)) {
      const suggestions = await filterAvailableUsernames(
        generateUsernameCandidates(username)
      );
      return NextResponse.json(
        {
          error: "This username is not available",
          code: "USERNAME_RESERVED",
          suggestions,
        },
        { status: 409 }
      );
    }

    const phoneE164 = rawPhoneNumber.trim();

    // Check for existing email, username, and phone number in parallel
    const [existingEmail, existingUsername, existingPhone] = await Promise.all([
      prisma.user.findUnique({ where: { email } }),
      prisma.user.findFirst({
        where: { usernameLower: lower },
        select: { id: true },
      }),
      prisma.user.findFirst({
        where: { phoneNumber: phoneE164 },
        select: { id: true },
      }),
    ]);

    if (existingEmail) {
      return NextResponse.json(
        {
          error: "An account with this email already exists",
          code: "EMAIL_EXISTS",
        },
        { status: 409 }
      );
    }

    if (existingUsername) {
      const suggestions = await filterAvailableUsernames(
        generateUsernameCandidates(username)
      );
      return NextResponse.json(
        {
          error: "This username is already taken",
          code: "USERNAME_EXISTS",
          suggestions,
        },
        { status: 409 }
      );
    }

    if (existingPhone) {
      return NextResponse.json(
        {
          error: "This phone number is already registered",
          code: "PHONE_EXISTS",
        },
        { status: 409 }
      );
    }

    // Create user (no password hashing as requested)
    const user = await prisma.user.create({
      data: {
        email,
        password, // Plain text as requested
        username,
        usernameLower: lower,
        name: `${firstName} ${lastName}`,
        firstName,
        lastName,
        phoneNumber: phoneE164,
        heardFrom,
        heardFromOther: heardFrom === "Other" ? heardFromOther?.trim() : null,
        emailVerified: false,
        primaryAuthMethod: "credentials",
      },
    });

    // Create verification token and send email
    try {
      const { token } = await createVerificationToken(user.id);
      await sendVerificationEmail(email, token, firstName);
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
      // Don't fail registration if email fails - user can resend
    }

    return NextResponse.json(
      {
        message:
          "Registration successful. Please check your email to verify your account.",
        userId: user.id,
        requiresVerification: true,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Registration error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Server error",
        code: "SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}
