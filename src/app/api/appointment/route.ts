// File: app/api/appointment/route.ts
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
    const specialistId = searchParams.get("specialistId"); // Added for the admin page
    const isAdminFetch = searchParams.get("admin") === "true";

    let whereClause: Prisma.AppointmentWhereInput = {};

    // Determine the query based on parameters and user role
    if (specialistId) {
      // This is for the admin's SpecialistDetailPage
      if (!session.user.isAdmin) {
        return NextResponse.json(
          { error: "Forbidden: Only admins can query by specialistId" },
          { status: 403 }
        );
      }
      whereClause = { specialistId };
    } else if (userId) {
      // For an admin fetching a specific user's appointments
      if (!session.user.isAdmin) {
        return NextResponse.json(
          { error: "Forbidden: Only admins can query by userId" },
          { status: 403 }
        );
      }
      whereClause = { userId };
    } else if (isAdminFetch && session.user.isAdmin) {
      // For an admin fetching all appointments
      whereClause = {};
    } else {
      // Default: a regular user fetching their own appointments
      whereClause = { userId: session.user.id };
    }

    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      select: {
        id: true,
        startTime: true, // Use new schema
        endTime: true, // Use new schema
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
          select: { id: true, name: true, firstName: true, lastName: true },
        },
        payment: { select: { status: true, amount: true } },
      },
      orderBy: { startTime: "desc" }, // Sort by the new field
    });

    const now = new Date();
    const formatted = await Promise.all(
      appointments.map(async (appt) => {
        let effectiveStatus = appt.status as
          | "upcoming"
          | "completed"
          | "cancelled"
          | "disputed";

        // Auto-update logic now uses startTime
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

        // Standardized format for all frontend components
        return {
          _id: appt.id,
          startTime: appt.startTime.toISOString(),
          endTime: appt.endTime.toISOString(),
          specialistName:
            appt.specialist?.name ||
            (appt.specialist?.application?.user
              ? buildDisplayName(appt.specialist.application.user)
              : "Unknown Specialist"),
          clientName: appt.user
            ? buildDisplayName(appt.user)
            : "Unknown Client",
          status: effectiveStatus,
          rate: appt.adjustedRate ?? appt.rate ?? appt.specialist?.rate ?? 0,
          venue: appt.venue,
          specialistId: appt.specialistId,
          specialistUserId: appt.specialist?.application?.userId || "",
          clientId: appt.user?.id,
          disputeStatus: appt.disputeStatus || "none",
          rating: appt.specialist?.rating ?? 0,
          reviewCount: appt.specialist?.reviewCount ?? 0,
          // For admin page compatibility
          user: { name: appt.user ? buildDisplayName(appt.user) : "Unknown" },
        };
      })
    );

    // The SpecialistDetailPage expects a flat array, so this is correct.
    return NextResponse.json(formatted);
  } catch (error) {
    console.error("GET appointments error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
