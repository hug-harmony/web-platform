import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

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

    return NextResponse.json({ message: "User registered" }, { status: 201 });
  } catch (error: unknown) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
