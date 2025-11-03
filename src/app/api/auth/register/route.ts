// /api/auth/register
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import nodemailer from "nodemailer";
import { z } from "zod";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import bcrypt from "bcrypt";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(20, "Username must be at most 20 characters")
  .regex(
    /^[a-zA-Z0-9_]+$/,
    "Only letters, numbers, and underscores are allowed"
  );

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Must contain an uppercase letter")
  .regex(/\d/, "Must contain a number")
  .regex(
    /[!@#$%^&*(),.?":{}|<>_\-\[\];'`~+/=\\]/,
    "Must contain a special character"
  );

const hearOptions = [
  "Social Media (e.g., Facebook, Instagram, X)",
  "Search Engine (e.g., Google)",
  "Friend or Family Referral",
  "Online Advertisement",
  "Podcast or Radio",
  "Email Newsletter",
  "Event or Workshop",
  "Professional Network (e.g., LinkedIn)",
  "Other",
] as const;

const reqSchema = z.object({
  username: usernameSchema,
  email: z.string().email(),
  password: passwordSchema,
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phoneNumber: z.string().min(1),
  ageVerification: z.boolean(),
  heardFrom: z.enum(hearOptions),
  heardFromOther: z.string().optional(),
});

const RESERVED = new Set([
  "admin",
  "support",
  "root",
  "hugharmony",
  "hug",
  "me",
  "null",
  "undefined",
]);

function sanitizeBase(u: string) {
  return u
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function candidateSuggestions(base: string) {
  const b = sanitizeBase(base);
  const list = [
    `${b}`,
    `${b}_${Math.floor(Math.random() * 900 + 100)}`,
    `${b}${new Date().getFullYear().toString().slice(-2)}`,
    `${b}x`,
    `${b}_official`,
  ];
  return Array.from(new Set(list))
    .filter((s) => s.length >= 3)
    .slice(0, 5);
}

async function filterFreeUsernames(candidates: string[]) {
  const existings = await prisma.user.findMany({
    where: { usernameLower: { in: candidates.map((s) => s.toLowerCase()) } },
    select: { usernameLower: true },
  });
  const takenSet = new Set(existings.map((e) => e.usernameLower));
  return candidates.filter((s) => !takenSet.has(s.toLowerCase()));
}

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const parsed = reqSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const {
      username,
      email,
      password,
      firstName,
      lastName,
      phoneNumber,
      ageVerification,
      heardFrom,
      heardFromOther,
    } = parsed.data;

    if (!ageVerification) {
      return NextResponse.json(
        { error: "You must confirm you are over 18 and agree to the terms" },
        { status: 400 }
      );
    }

    if (heardFrom === "Other" && !heardFromOther?.trim()) {
      return NextResponse.json(
        { error: "Please specify how you heard about us" },
        { status: 400 }
      );
    }

    const lower = username.toLowerCase();
    if (RESERVED.has(lower)) {
      const suggestions = await filterFreeUsernames(
        candidateSuggestions(username)
      );
      return NextResponse.json(
        { error: "Username unavailable", suggestions },
        { status: 409 }
      );
    }

    const p = parsePhoneNumberFromString(phoneNumber);
    if (!p?.isValid()) {
      return NextResponse.json(
        { error: "Invalid phone number" },
        { status: 400 }
      );
    }
    const phoneE164 = p.number;

    const [existingEmail, existingUsername] = await Promise.all([
      prisma.user.findUnique({ where: { email } }),
      prisma.user.findFirst({
        where: { usernameLower: lower },
        select: { id: true },
      }),
    ]);

    if (existingEmail) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 400 }
      );
    }
    if (existingUsername) {
      const suggestions = await filterFreeUsernames(
        candidateSuggestions(username)
      );
      return NextResponse.json(
        { error: "Username already exists", suggestions },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        username,
        usernameLower: lower,
        name: `${firstName} ${lastName}`,
        firstName,
        lastName,
        phoneNumber: phoneE164,
        googleId: null,
        heardFrom,
        heardFromOther: heardFrom === "Other" ? heardFromOther?.trim() : null,
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

Warm hugs,
The Hug Harmony Team`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2 style="color: #E7C4BB;">Welcome, ${firstName}! </h2>
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
