// src\app\api\discounts\professional\[professionalId]\route.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ professionalId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized: No session found" },
        { status: 401 }
      );
    }

    const { professionalId } = await params;
    if (!professionalId || !/^[0-9a-fA-F]{24}$/.test(professionalId)) {
      return NextResponse.json(
        { error: "Invalid professional ID" },
        { status: 400 }
      );
    }

    //     // Check if the user is the professional
    //     const application = await prisma.professionalApplication.findFirst({
    //       where: { professionalId, userId: session.user.id, status: "approved" },
    //     });

    //     if (!application) {
    //       return NextResponse.json(
    //         { error: "Unauthorized: You can only view your own discounts" },
    //         { status: 403 }
    //       );
    //     }

    const discounts = await prisma.discount.findMany({
      where: { professionalId },
      include: { professional: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      discounts.map((discount) => ({
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
      }))
    );
  } catch (error: any) {
    console.error("Error fetching discounts:", error);
    return NextResponse.json(
      { error: "Internal server error: Failed to fetch discounts" },
      { status: 500 }
    );
  }
}
