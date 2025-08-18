import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is a specialist
    const specialistApplication = await prisma.specialistApplication.findFirst({
      where: {
        userId: session.user.id,
        status: "approved",
      },
      select: {
        specialistId: true,
      },
    });
    if (!specialistApplication || !specialistApplication.specialistId) {
      return NextResponse.json(
        { error: "Forbidden: User is not a specialist" },
        { status: 403 }
      );
    }

    const appointments = await prisma.appointment.findMany({
      where: { specialistId: specialistApplication.specialistId },
      include: { user: true, specialist: true },
      orderBy: { createdAt: "desc" },
    });

    const formatted = appointments.map((appt) => ({
      _id: appt.id,
      clientName: appt.user?.name || "Unknown Client",
      specialistId: appt.specialistId,
      specialistName: appt.specialist?.name || "Unknown Specialist",
      date: appt.date.toISOString().split("T")[0],
      time: appt.time,
      location: appt.specialist?.location || "Unknown",
      status: appt.status as "upcoming" | "completed" | "cancelled",
      rating: appt.specialist?.rating ?? 0,
      reviewCount: appt.specialist?.reviewCount ?? 0,
      rate: appt.specialist?.rate ?? 0,
      clientId: appt.userId, // Explicitly include userId as clientId
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("GET client appointments error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
