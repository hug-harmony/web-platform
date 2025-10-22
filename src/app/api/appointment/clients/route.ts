// File: app/api/appointment/clients/route.ts
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { buildDisplayName } from "@/lib/utils";

// Note: The Prisma.AppointmentGetPayload type might need regeneration after schema changes
// If you get type errors, run `npx prisma generate` again.
type AppointmentWithRelations = Prisma.AppointmentGetPayload<{
  select: {
    id: true;
    startTime: true; // UPDATED
    endTime: true; // UPDATED
    status: true;
    adjustedRate: true;
    rate: true;
    userId: true;
    specialistId: true;
    disputeStatus: true;
    venue: true;
    user: { select: { id: true; name: true; firstName: true; lastName: true } };
    specialist: {
      select: {
        name: true;
        rating: true;
        reviewCount: true;
        rate: true;
        venue: true;
        application: {
          select: {
            userId: true;
            user: { select: { name: true; firstName: true; lastName: true } };
          };
        };
      };
    };
  };
}>;

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const specialistApplication = await prisma.specialistApplication.findFirst({
      where: { userId: session.user.id, status: "approved" },
      select: { specialistId: true },
    });
    if (!specialistApplication?.specialistId) {
      return NextResponse.json(
        { error: "Forbidden: User is not a specialist" },
        { status: 403 }
      );
    }

    const appointments: AppointmentWithRelations[] =
      await prisma.appointment.findMany({
        where: { specialistId: specialistApplication.specialistId },
        select: {
          id: true,
          startTime: true, // UPDATED
          endTime: true, // UPDATED
          status: true,
          adjustedRate: true,
          rate: true,
          userId: true,
          specialistId: true,
          disputeStatus: true,
          venue: true,
          user: {
            select: { id: true, name: true, firstName: true, lastName: true },
          },
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
        },
        orderBy: { startTime: "desc" }, // UPDATED to sort by startTime
      });

    const now = new Date();
    const formatted = await Promise.all(
      appointments.map(async (appt) => {
        let effectiveStatus = appt.status as
          | "upcoming"
          | "completed"
          | "cancelled"
          | "disputed";

        // UPDATED: Logic now uses `startTime` to check if an appointment is in the past
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

        // UPDATED: Returning startTime and endTime
        return {
          _id: appt.id,
          clientName: appt.user
            ? buildDisplayName(appt.user)
            : "Unknown Client",
          specialistId: appt.specialistId,
          // This logic remains the same
          specialistName:
            appt.specialist?.name ||
            (appt.specialist?.application?.user
              ? buildDisplayName(appt.specialist.application.user)
              : "Unknown Specialist"),
          startTime: appt.startTime.toISOString(), // UPDATED
          endTime: appt.endTime.toISOString(), // UPDATED
          status: effectiveStatus,
          rating: appt.specialist?.rating ?? 0,
          reviewCount: appt.specialist?.reviewCount ?? 0,
          rate: appt.adjustedRate ?? appt.rate ?? appt.specialist?.rate ?? 0,
          venue: appt.venue,
          specialistVenue: appt.specialist?.venue,
          clientId: appt.userId,
          disputeStatus: appt.disputeStatus || "none",
        };
      })
    );

    console.log(
      `Fetching client appointments for specialistId: ${specialistApplication.specialistId}, found: ${appointments.length}`
    );

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("GET client appointments error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
