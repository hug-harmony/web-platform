// app/api/appointment/route.ts
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

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const isAdminFetch = searchParams.get("admin") === "true";

    let whereClause: Prisma.AppointmentWhereInput = {};
    if (userId) {
      whereClause = { userId };
    } else if (isAdminFetch && session.user.isAdmin) {
      whereClause = {};
    } else {
      whereClause = { userId: session.user.id };
    }

    if (userId && !session.user.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      select: {
        id: true,
        date: true,
        time: true,
        status: true,
        adjustedRate: true,
        rate: true,
        specialistId: true,
        disputeStatus: true,
        venue: true,
        specialist: {
          select: {
            name: true,
            rating: true,
            reviewCount: true,
            rate: true,
            venue: true,
            application: {
              select: {
                userId: true,
                user: {
                  select: { name: true, firstName: true, lastName: true },
                },
              },
            },
          },
        },
        user: {
          select: { name: true, firstName: true, lastName: true, id: true },
        },
        payment: { select: { status: true, amount: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const now = new Date();
    const formatted = await Promise.all(
      appointments.map(async (appt) => {
        let effectiveStatus = appt.status as
          | "upcoming"
          | "completed"
          | "cancelled"
          | "disputed";

        if (
          effectiveStatus === "upcoming" &&
          appt.date.getTime() < now.getTime()
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
          date: appt.date.toISOString().split("T")[0],
          time: appt.time,
          cuddlerName:
            appt.specialist?.name ||
            (appt.specialist?.application?.user
              ? buildDisplayName(appt.specialist.application.user)
              : "Unknown Specialist"),
          clientName: appt.user
            ? buildDisplayName(appt.user)
            : "Unknown Client",
          status: effectiveStatus,
          paymentStatus: appt.payment?.status || "unknown",
          amount:
            appt.adjustedRate ??
            appt.rate ??
            appt.payment?.amount ??
            appt.specialist?.rate ??
            0,
          venue: appt.venue,
          specialistVenue: appt.specialist?.venue,
          specialistId: appt.specialistId,
          specialistUserId: appt.specialist?.application?.userId || "",
          disputeStatus: appt.disputeStatus || "none",
        };
      })
    );

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
