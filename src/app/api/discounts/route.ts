/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

// Validation schema for creating discounts
const discountSchema = z.object({
  name: z.string().min(1, "Discount name is required"),
  rate: z.number().min(0, "Rate must be non-negative"),
  discount: z.number().min(0).max(100, "Discount must be between 0 and 100"),
  professionalId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid professional ID"),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized: No session found" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validatedData = discountSchema.parse(body);

    // Check if the user is the professional
    const application = await prisma.professionalApplication.findFirst({
      where: {
        professionalId: validatedData.professionalId,
        userId: session.user.id,
        status: "APPROVED",
      },
    });

    if (!application) {
      return NextResponse.json(
        {
          error:
            "Unauthorized: You can only create discounts for your own approved professional profile",
        },
        { status: 403 }
      );
    }

    const discount = await prisma.discount.create({
      data: {
        professionalId: validatedData.professionalId,
        name: validatedData.name,
        rate: validatedData.rate,
        discount: validatedData.discount,
      },
      include: { professional: { select: { id: true, name: true } } },
    });

    return NextResponse.json(
      {
        id: discount.id,
        name: discount.name,
        rate: discount.rate,
        discount: discount.discount,
        professional: {
          id: discount.professional.id,
          name: discount.professional.name,
        },
        createdAt: discount.createdAt,
        updatedAt: discount.updatedAt,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating discount:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error: Failed to create discount" },
      { status: 500 }
    );
  }
}
