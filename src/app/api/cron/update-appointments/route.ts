// src/app/api/cron/update-appointments/route.ts
// (Move and rename the file to this path)

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createConfirmation } from "@/lib/services/payments/confirmation.service";

export async function GET(request: NextRequest) {
  // Verify the request is from authorized source
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    let updatedCount = 0;
    let ongoingCount = 0;
    let completedCount = 0;
    let confirmationsCreated = 0;
    const confirmationErrors: string[] = [];

    console.log(
      `[CRON] Starting appointment status update at ${now.toISOString()}`
    );

    // Get all upcoming appointments
    const upcomingAppointments = await prisma.appointment.findMany({
      where: {
        status: "upcoming",
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        status: true,
      },
    });

    console.log(
      `[CRON] Found ${upcomingAppointments.length} upcoming appointments`
    );

    // Get all ongoing appointments to check if they should be completed
    const ongoingAppointments = await prisma.appointment.findMany({
      where: {
        status: "ongoing",
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        status: true,
      },
    });

    console.log(
      `[CRON] Found ${ongoingAppointments.length} ongoing appointments`
    );

    // Process upcoming appointments
    for (const appointment of upcomingAppointments) {
      const appointmentDateTime = appointment.startTime;
      const appointmentEndTime = appointment.endTime;

      if (!appointmentDateTime || !appointmentEndTime) {
        console.log(
          `[CRON] Skipping appointment ${appointment.id} - invalid startTime/endTime`
        );
        continue;
      }

      // Check if appointment should be marked as ongoing
      if (now >= appointmentDateTime && now < appointmentEndTime) {
        await prisma.appointment.update({
          where: { id: appointment.id },
          data: { status: "ongoing" },
        });

        ongoingCount++;
        updatedCount++;
        console.log(`[CRON] Marked appointment ${appointment.id} as ongoing`);
      }
      // Check if appointment should be directly marked as completed
      else if (now >= appointmentEndTime) {
        await prisma.appointment.update({
          where: { id: appointment.id },
          data: { status: "completed" },
        });

        completedCount++;
        updatedCount++;
        console.log(
          `[CRON] Directly marked appointment ${appointment.id} as completed`
        );

        // Create confirmation for payment tracking
        try {
          await createConfirmation(appointment.id);
          confirmationsCreated++;
          console.log(
            `[CRON] Created confirmation for appointment ${appointment.id}`
          );
        } catch (error) {
          const errorMsg = `Failed to create confirmation for ${appointment.id}: ${error}`;
          confirmationErrors.push(errorMsg);
          console.error(`[CRON] ${errorMsg}`);
        }
      }
    }

    // Process ongoing appointments to mark as completed
    for (const appointment of ongoingAppointments) {
      const appointmentEndTime = appointment.endTime;

      if (!appointmentEndTime) {
        console.log(
          `[CRON] Skipping appointment ${appointment.id} - invalid endTime`
        );
        continue;
      }

      // Mark as completed if appointment end time has passed
      if (now >= appointmentEndTime) {
        await prisma.appointment.update({
          where: { id: appointment.id },
          data: { status: "completed" },
        });

        completedCount++;
        updatedCount++;
        console.log(`[CRON] Marked appointment ${appointment.id} as completed`);

        // Create confirmation for payment tracking
        try {
          await createConfirmation(appointment.id);
          confirmationsCreated++;
          console.log(
            `[CRON] Created confirmation for appointment ${appointment.id}`
          );
        } catch (error) {
          const errorMsg = `Failed to create confirmation for ${appointment.id}: ${error}`;
          confirmationErrors.push(errorMsg);
          console.error(`[CRON] ${errorMsg}`);
        }
      }
    }

    const summary = {
      success: true,
      timestamp: now.toISOString(),
      totalProcessed: upcomingAppointments.length + ongoingAppointments.length,
      totalUpdated: updatedCount,
      markedOngoing: ongoingCount,
      markedCompleted: completedCount,
      confirmationsCreated,
      confirmationErrors,
      message: "Appointment status update completed successfully",
    };

    console.log(`[CRON] Summary:`, summary);

    return NextResponse.json(summary);
  } catch (error) {
    console.error("[CRON] Error updating appointment statuses:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to update appointment statuses",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  console.log("[CRON] Manual trigger received");
  return GET(request);
}
