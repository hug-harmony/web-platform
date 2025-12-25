import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { buildDisplayName } from "@/lib/utils";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if admin
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true },
    });

    if (!currentUser?.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const professionalId = searchParams.get("professionalId");

    let whereClause: Prisma.AppointmentWhereInput = {};

    if (userId) {
      whereClause = { userId };
    } else if (professionalId) {
      whereClause = { professionalId };
    }

    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      select: {
        id: true,
        startTime: true,
        endTime: true,
        status: true,
        adjustedRate: true,
        rate: true,
        professionalId: true,
        userId: true,
        disputeStatus: true,
        venue: true,
        professional: {
          select: {
            name: true,
            rating: true,
            reviewCount: true,
            rate: true,
            venue: true,
          },
        },
        user: {
          select: { id: true, name: true, firstName: true, lastName: true },
        },
        payment: { select: { status: true, amount: true } },
      },
      orderBy: { startTime: "desc" },
    });

    const now = new Date();
    const formatted = await Promise.all(
      appointments.map(async (appt) => {
        let effectiveStatus = appt.status as
          | "upcoming"
          | "completed"
          | "cancelled"
          | "disputed";

        // Auto-update logic
        if (
          effectiveStatus === "upcoming" &&
          appt.startTime.getTime() < now.getTime()
        ) {
          effectiveStatus = "completed";
          try {
            await prisma.appointment.update({
              where: { id: appt.id },
              data: { status: "completed" },
            });
          } catch (err) {
            console.error(`Failed to auto-update appointment ${appt.id}`, err);
          }
        }

        return {
          _id: appt.id,
          id: appt.id,
          startTime: appt.startTime.toISOString(),
          endTime: appt.endTime.toISOString(),
          startTimeFormatted: appt.startTime.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
          endTimeFormatted: appt.endTime.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
          professionalName: appt.professional?.name || "Unknown Professional",
          clientName: appt.user
            ? buildDisplayName(appt.user)
            : "Unknown Client",
          status: effectiveStatus,
          rate: appt.adjustedRate ?? appt.rate ?? appt.professional?.rate ?? 0,
          venue: appt.venue,
          professionalId: appt.professionalId,
          clientId: appt.userId,
          disputeStatus: appt.disputeStatus || "none",
          rating: appt.professional?.rating ?? 0,
          reviewCount: appt.professional?.reviewCount ?? 0,
          paymentStatus: appt.payment?.status || "pending",
          paymentAmount: appt.payment?.amount || 0,
          user: { name: appt.user ? buildDisplayName(appt.user) : "Unknown" },
        };
      })
    );

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("GET /api/admin/appointments error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
