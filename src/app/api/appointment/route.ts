import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

const prisma = new PrismaClient();

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    // Check if user is admin if fetching for another user
    if (userId) {
      const currentUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { isAdmin: true },
      });
      if (!currentUser?.isAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const appointments = await prisma.appointment.findMany({
      where: { userId: userId || session.user.id },
      include: { specialist: true, user: true },
      orderBy: { createdAt: "desc" },
    });

    const formatted = appointments.map((appt) => ({
      _id: appt.id,
      name: appt.user?.name || "Unknown",
      specialistId: appt.specialistId,
      specialistName: appt.specialist?.name || "Unknown Specialist",
      date: appt.date.toISOString().split("T")[0],
      time: appt.time,
      location: appt.specialist?.location || "Unknown",
      status: appt.status as "upcoming" | "completed" | "cancelled",
      rating: appt.specialist?.rating ?? 0,
      reviewCount: appt.specialist?.reviewCount ?? 0,
      rate: appt.specialist?.rate ?? 0,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("GET appointments error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
