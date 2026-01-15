// src\app\api\settings\company-cut\route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

const companyCutSchema = z.object({
  companyCutPercentage: z.number().min(0).max(100),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized: Admin access required" },
        { status: 401 }
      );
    }

    const setting = await prisma.companySettings.findUnique({
      where: { key: "companyCutPercentage" },
    });

    const companyCutPercentage = setting ? setting.value : 20.0;
    return NextResponse.json({ companyCutPercentage });
  } catch (error) {
    console.error("GET company cut error:", error);
    return NextResponse.json(
      {
        error: "Internal server error: Failed to fetch company cut percentage",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized: Admin access required" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { companyCutPercentage } = companyCutSchema.parse(body);

    const updatedSetting = await prisma.companySettings.upsert({
      where: { key: "companyCutPercentage" },
      update: { value: companyCutPercentage.toString(), updatedAt: new Date() },
      create: {
        key: "companyCutPercentage",
        value: companyCutPercentage.toString(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Update all approved professionals with the new company cut percentage
    await prisma.professional.updateMany({
      where: { applications: { some: { status: "APPROVED" } } },
      data: { companyCutPercentage },
    });

    return NextResponse.json(updatedSetting);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      {
        error: "Internal server error: Failed to update company cut percentage",
      },
      { status: 500 }
    );
  }
}
