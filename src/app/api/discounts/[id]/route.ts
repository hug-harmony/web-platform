/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

// Validation schema for creating/updating discounts
const discountSchema = z.object({
  name: z.string().min(1, "Discount name is required"),
  rate: z.number().min(0, "Rate must be non-negative"),
  discount: z.number().min(0).max(100, "Discount must be between 0 and 100"),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized: No session found" },
        { status: 401 }
      );
    }

    const { id } = await params;
    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return NextResponse.json(
        { error: "Invalid discount ID" },
        { status: 400 }
      );
    }

    const discount = await prisma.discount.findUnique({
      where: { id },
      include: { specialist: { select: { id: true, name: true } } },
    });

    if (!discount) {
      return NextResponse.json(
        { error: "Discount not found" },
        { status: 404 }
      );
    }

    // Ensure the user is the specialist who owns the discount
    const application = await prisma.specialistApplication.findFirst({
      where: {
        specialistId: discount.specialistId,
        userId: session.user.id,
        status: "approved",
      },
    });

    if (!application) {
      return NextResponse.json(
        { error: "Unauthorized: You can only view your own discounts" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      id: discount.id,
      name: discount.name,
      rate: discount.rate,
      discount: discount.discount,
      specialist: {
        id: discount.specialist.id,
        name: discount.specialist.name,
      },
      createdAt: discount.createdAt,
      updatedAt: discount.updatedAt,
    });
  } catch (error: any) {
    console.error("Error fetching discount:", error);
    return NextResponse.json(
      { error: "Internal server error: Failed to fetch discount" },
      { status: 500 }
    );
  }
}

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
    const { specialistId } = body;

    if (!specialistId || !/^[0-9a-fA-F]{24}$/.test(specialistId)) {
      return NextResponse.json(
        { error: "Invalid specialist ID" },
        { status: 400 }
      );
    }

    // Check if the user is the specialist
    const application = await prisma.specialistApplication.findFirst({
      where: { specialistId, userId: session.user.id, status: "approved" },
    });

    if (!application) {
      return NextResponse.json(
        {
          error:
            "Unauthorized: You can only create discounts for your own profile",
        },
        { status: 403 }
      );
    }

    const discount = await prisma.discount.create({
      data: {
        specialistId,
        name: validatedData.name,
        rate: validatedData.rate,
        discount: validatedData.discount,
      },
      include: { specialist: { select: { id: true, name: true } } },
    });

    return NextResponse.json(
      {
        id: discount.id,
        name: discount.name,
        rate: discount.rate,
        discount: discount.discount,
        specialist: {
          id: discount.specialist.id,
          name: discount.specialist.name,
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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized: No session found" },
        { status: 401 }
      );
    }

    const { id } = await params;
    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return NextResponse.json(
        { error: "Invalid discount ID" },
        { status: 400 }
      );
    }

    const discount = await prisma.discount.findUnique({
      where: { id },
    });

    if (!discount) {
      return NextResponse.json(
        { error: "Discount not found" },
        { status: 404 }
      );
    }

    // Check if the user is the specialist
    const application = await prisma.specialistApplication.findFirst({
      where: {
        specialistId: discount.specialistId,
        userId: session.user.id,
        status: "approved",
      },
    });

    if (!application) {
      return NextResponse.json(
        { error: "Unauthorized: You can only update your own discounts" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validatedData = discountSchema.parse(body);

    const updatedDiscount = await prisma.discount.update({
      where: { id },
      data: {
        name: validatedData.name,
        rate: validatedData.rate,
        discount: validatedData.discount,
      },
      include: { specialist: { select: { id: true, name: true } } },
    });

    return NextResponse.json({
      id: updatedDiscount.id,
      name: updatedDiscount.name,
      rate: updatedDiscount.rate,
      discount: updatedDiscount.discount,
      specialist: {
        id: updatedDiscount.specialist.id,
        name: updatedDiscount.specialist.name,
      },
      createdAt: updatedDiscount.createdAt,
      updatedAt: updatedDiscount.updatedAt,
    });
  } catch (error: any) {
    console.error("Error updating discount:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "Discount not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error: Failed to update discount" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized: No session found" },
        { status: 401 }
      );
    }

    const { id } = await params;
    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return NextResponse.json(
        { error: "Invalid discount ID" },
        { status: 400 }
      );
    }

    const discount = await prisma.discount.findUnique({
      where: { id },
    });

    if (!discount) {
      return NextResponse.json(
        { error: "Discount not found" },
        { status: 404 }
      );
    }

    // Check if the user is the specialist
    const application = await prisma.specialistApplication.findFirst({
      where: {
        specialistId: discount.specialistId,
        userId: session.user.id,
        status: "approved",
      },
    });

    if (!application) {
      return NextResponse.json(
        { error: "Unauthorized: You can only delete your own discounts" },
        { status: 403 }
      );
    }

    await prisma.discount.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Discount deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting discount:", error);
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "Discount not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error: Failed to delete discount" },
      { status: 500 }
    );
  }
}
