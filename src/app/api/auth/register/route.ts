import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("Register request body:", body);
    const { email, password, firstName, lastName, phoneNumber } = body;

    if (
      !firstName ||
      !email ||
      !password ||
      !lastName ||
      !phoneNumber ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      typeof firstName !== "string" ||
      typeof lastName !== "string" ||
      typeof phoneNumber !== "string"
    ) {
      return NextResponse.json(
        { error: "All fields required" },
        { status: 400 }
      );
    }

    if ("googleId" in body) {
      console.warn("Unexpected googleId:", body.googleId);
      return NextResponse.json(
        { error: "Google ID not allowed" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 400 }
      );
    }

    await prisma.user.create({
      data: {
        email,
        password,
        name: `${firstName} ${lastName}`,
        firstName,
        lastName,
        phoneNumber,
        googleId: null,
        createdAt: new Date(),
      },
    });

    await transporter.sendMail({
      from: `"Hug Harmony Support" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Welcome to Hug Harmony, ${firstName}!`,
      text: `Hello ${firstName},

Welcome to Hug Harmony! We're so happy you've joined our community.

You can get started by visiting your dashboard here:
${process.env.NEXT_PUBLIC_APP_URL}/dashboard

We can't wait to see the harmony you'll create!

Warm hugs,
The Hug Harmony Team
`,
      html: `
    <div style="font-family: Arial, sans-serif; color: #333;">
      <h2 style="color: #E7C4BB;">Welcome, ${firstName}! 🎉</h2>
      <p>We're thrilled to have you join the <strong>Hug Harmony</strong> family.</p>
      <p>Your journey starts here:</p>
      <p style="margin: 20px 0;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" 
           style="background-color: #E7C4BB; color: #000; padding: 10px 20px; border-radius: 8px; text-decoration: none;">
          Explore Your Dashboard
        </a>
      </p>
      <p>We can't wait to see the harmony you'll create!</p>
      <p>Warm hugs,<br>The Hug Harmony Team</p>
    </div>
  `,
    });

    return NextResponse.json({ message: "User registered" }, { status: 201 });
  } catch (error: unknown) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
