import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  console.log(req.url);

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const users = await prisma.user.findMany({
      where: {
        id: { not: session.user.id }, // Exclude the current user's ID
        professionalApplication: null, // Filter out users with professional applications
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        name: true,
        profileImage: true,
        location: true,
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching non-professional users:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
