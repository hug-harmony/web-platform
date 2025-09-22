// app/api/appointment/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const isAdminFetch = searchParams.get("admin") === "true";

    let whereClause = {};
    if (userId) {
      whereClause = { userId };
    } else if (isAdminFetch && session.user.isAdmin) {
      // Fetch all for admin
    } else {
      whereClause = { userId: session.user.id };
    }

    if (userId && !session.user.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      include: {
        specialist: {
          select: {
            name: true,
            rating: true,
            reviewCount: true,
            rate: true,
            userId: true,
          },
        },
        user: { select: { name: true, id: true } },
        payment: { select: { status: true, amount: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = appointments.map((appt) => ({
      _id: appt.id,
      date: appt.date.toISOString().split("T")[0],
      time: appt.time,
      cuddlerName: appt.specialist?.name || "Unknown Specialist",
      clientName: appt.user?.name || "Unknown Client",
      status: appt.status as
        | "upcoming"
        | "completed"
        | "cancelled"
        | "disputed",
      paymentStatus: appt.payment?.status || "unknown",
      amount: appt.payment?.amount || 0,
      specialistId: appt.specialistId,
      specialistUserId: appt.specialist?.userId || "",
      disputeStatus: appt.disputeStatus || "none",
    }));

    console.log(
      `Fetching appointments for userId: ${session.user.id}, found: ${appointments.length}`
    );

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("GET appointments error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
