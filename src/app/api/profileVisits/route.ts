import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    const { specialistId } = await req.json();

    console.log("Profile visit request:", {
      specialistId,
      userId: session?.user?.id,
    });

    if (!specialistId) {
      return NextResponse.json(
        { error: "Specialist ID is required" },
        { status: 400 }
      );
    }

    const profileVisit = await prisma.profileVisit.create({
      data: {
        userId: session?.user?.id || null, // Nullable for anonymous visits
        specialistId,
      },
    });

    console.log("Profile visit saved:", profileVisit);

    return NextResponse.json(profileVisit, { status: 201 });
  } catch (error) {
    console.error("Error recording profile visit:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
