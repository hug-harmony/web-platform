/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { email, password, firstName, lastName, phoneNumber } =
      await request.json();
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
        { error: "All fields are required" },
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
        phoneNumber,
        createdAt: new Date(),
      } as any, // Temporary workaround to bypass type checking
    });

    return NextResponse.json(
      { message: "User registered successfully" },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
