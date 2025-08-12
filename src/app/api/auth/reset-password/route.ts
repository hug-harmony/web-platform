import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function POST(request: Request) {
  const { email } = await request.json();
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, googleId: true, password: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.googleId && !user.password) {
      return NextResponse.json(
        { error: "This account uses Google login" },
        { status: 400 }
      );
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60);
    await prisma.passwordResetToken.upsert({
      where: { userId: user.id },
      update: { token, expiresAt },
      create: { userId: user.id, token, expiresAt },
    });
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password/${token}`;
    // await transporter.sendMail({
    //   from: `"Support" <${process.env.SMTP_USER}>`,
    //   to: email,
    //   subject: "Password Reset Request",
    //   text: `You requested a password reset. Click the link below to set a new password:\n\n${resetUrl}`,
    //   html: `
    //     <h2>Password Reset Request</h2>
    //     <p>You requested to reset your password.</p>
    //     <p><a href="${resetUrl}">Click here to reset your password</a></p>
    //     <p>If you did not request this, please ignore this email.</p>
    //   `,
    // });

    await transporter.sendMail({
      from: `"Hug Harmony Support" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Reset Your Password",
      text: `Hello,

We received a request to reset your Hug Harmony password.

If this was you, click the link below to securely set a new password:
${resetUrl}

If you did not request this change, you can safely ignore this email — your password will remain the same.

Stay safe and take care,
The Hug Harmony Team
`,
      html: `
    <div style="font-family: Arial, sans-serif; color: #333;">
      <h2 style="color: #E7C4BB;">Password Reset Request</h2>
      <p>We received a request to reset your <strong>Hug Harmony</strong> password.</p>
      <p style="margin: 20px 0;">
        <a href="${resetUrl}" 
           style="background-color: #E7C4BB; color: #000; padding: 10px 20px; border-radius: 8px; text-decoration: none;">
          Reset My Password
        </a>
      </p>
      <p>If you didn’t request this change, you can safely ignore this email — your password will stay the same.</p>
      <p>Stay safe and take care,<br>The Hug Harmony Team</p>
    </div>
  `,
    });

    return NextResponse.json({ message: "Reset email sent successfully" });
  } catch (error) {
    console.error("Reset email error:", error);
    return NextResponse.json(
      { error: "Failed to send password reset email" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const { token, password } = await request.json();
  if (!token || !password) {
    return NextResponse.json(
      { error: "Token and password are required" },
      { status: 400 }
    );
  }
  try {
    const resetToken = await prisma.passwordResetToken.findFirst({
      where: { token, expiresAt: { gt: new Date() } },
      include: { user: true },
    });
    if (!resetToken) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 400 }
      );
    }
    await prisma.user.update({
      where: { id: resetToken.userId },
      data: { password }, // Store password as plain text (not secure)
    });
    await prisma.passwordResetToken.delete({
      where: { id: resetToken.id },
    });
    return NextResponse.json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Password reset error:", error);
    return NextResponse.json(
      { error: "Failed to reset password" },
      { status: 500 }
    );
  }
}
