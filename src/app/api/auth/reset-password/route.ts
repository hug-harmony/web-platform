// app/api/auth/reset-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import nodemailer from "nodemailer";
import bcrypt from "bcrypt";
import { parsePhoneNumberFromString } from "libphonenumber-js";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/* ---------- POST: request reset (email OR phone) ---------- */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email, phone } = body;

  if (!email && !phone) {
    return NextResponse.json(
      { error: "Email or phone number required" },
      { status: 400 }
    );
  }

  try {
    let user:
      | {
          id: string;
          googleId: string | null;
          password: string | null;
          phoneNumber?: string | null;
          email?: never;
        }
      | {
          id: string;
          googleId: string | null;
          password: string | null;
          email?: string;
          phoneNumber?: never;
        }
      | null = null;

    if (email) {
      user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          googleId: true,
          password: true,
          phoneNumber: true,
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
          googleId: true,
          password: true,
          email: true,
        },
      });
    }

    // Hide existence
    if (!user || (user.googleId && !user.password)) {
      return NextResponse.json(
        { message: "If the account exists, a reset link was sent." },
        { status: 200 }
      );
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordResetToken.upsert({
      where: { userId: user.id },
      update: { token, expiresAt },
      create: { userId: user.id, token, expiresAt },
    });

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password/${token}`;

    // Safely extract contact method
    const sendTo =
      email ||
      ("email" in user && user.email ? user.email : null) ||
      ("phoneNumber" in user && user.phoneNumber ? user.phoneNumber : null);

    if (!sendTo) {
      return NextResponse.json(
        { error: "No contact method available" },
        { status: 400 }
      );
    }

    // Send via email if it's an email
    if (sendTo.includes("@")) {
      await transporter.sendMail({
        from: `"Hug Harmony Support" <${process.env.SMTP_USER}>`,
        to: sendTo,
        subject: "Reset Your Hug Harmony Password",
        text: `Click to reset (valid 1 hour): ${resetUrl}\n\nIgnore if not you.`,
        html: `
<div style="font-family:Arial,sans-serif;color:#333;">
  <h2 style="color:#E7C4BB;">Password Reset</h2>
  <p>Click below (valid 1 hour):</p>
  <p style="margin:20px 0;">
    <a href="${resetUrl}" style="background:#E7C4BB;color:#000;padding:10px 20px;border-radius:8px;text-decoration:none;">
      Reset Password
    </a>
  </p>
  <p>Ignore if you didn’t request this.</p>
  <p>Warm hugs,<br>Hug Harmony Team</p>
</div>`,
      });
    } else {
      // TODO: SMS (Twilio, etc.)
      console.log(`SMS to ${sendTo}: ${resetUrl}`);
    }

    return NextResponse.json(
      { message: "If the account exists, a reset link was sent." },
      { status: 200 }
    );
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
  const { token, password } = await request.json();
  if (!token || !password) {
    return NextResponse.json(
      { error: "Token and password required" },
      { status: 400 }
    );
  }

  try {
    const rec = await prisma.passwordResetToken.findFirst({
      where: { token, expiresAt: { gt: new Date() } },
      include: { user: true },
    });

    if (!rec) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 400 }
      );
    }

    const hashed = await bcrypt.hash(password, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: rec.userId },
        data: { password: hashed },
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
