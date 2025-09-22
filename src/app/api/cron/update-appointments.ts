// api/cron/update-appointments.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  // Verify the request is from Vercel Cron (optional security check)
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
        date: true,
        time: true,
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
        date: true,
        time: true,
        status: true,
      },
    });

    console.log(
      `[CRON] Found ${ongoingAppointments.length} ongoing appointments`
    );

    // Process upcoming appointments
    for (const appointment of upcomingAppointments) {
      const appointmentDateTime = parseAppointmentDateTime(
        appointment.date,
        appointment.time
      );

      if (!appointmentDateTime) {
        console.log(
          `[CRON] Skipping appointment ${appointment.id} - invalid date/time format`
        );
        continue;
      }

      // Check if appointment should be marked as ongoing
      // Consider appointment as ongoing if current time is within appointment time (assuming 1 hour duration)
      const appointmentEndTime = new Date(
        appointmentDateTime.getTime() + 60 * 60 * 1000
      ); // +1 hour

      if (now >= appointmentDateTime && now < appointmentEndTime) {
        // Mark as ongoing
        await prisma.appointment.update({
          where: { id: appointment.id },
          data: { status: "ongoing" },
        });

        ongoingCount++;
        updatedCount++;
        console.log(`[CRON] Marked appointment ${appointment.id} as ongoing`);
      }
    }

    // Process ongoing appointments to mark as completed
    const allOngoingAppointments = [...ongoingAppointments];

    // Add newly marked ongoing appointments to the check
    const newlyOngoing = await prisma.appointment.findMany({
      where: {
        status: "ongoing",
        id: { in: upcomingAppointments.map((a) => a.id) },
      },
      select: {
        id: true,
        date: true,
        time: true,
        status: true,
      },
    });

    allOngoingAppointments.push(...newlyOngoing);

    for (const appointment of allOngoingAppointments) {
      const appointmentDateTime = parseAppointmentDateTime(
        appointment.date,
        appointment.time
      );

      if (!appointmentDateTime) {
        console.log(
          `[CRON] Skipping appointment ${appointment.id} - invalid date/time format`
        );
        continue;
      }

      // Mark as completed if appointment end time has passed (assuming 1 hour duration)
      const appointmentEndTime = new Date(
        appointmentDateTime.getTime() + 60 * 60 * 1000
      ); // +1 hour

      if (now >= appointmentEndTime) {
        await prisma.appointment.update({
          where: { id: appointment.id },
          data: { status: "completed" },
        });

        completedCount++;
        updatedCount++;
        console.log(`[CRON] Marked appointment ${appointment.id} as completed`);
      }
    }

    // Also check for any upcoming appointments that should be directly marked as completed
    // (in case the cron job missed the ongoing status)
    for (const appointment of upcomingAppointments) {
      const appointmentDateTime = parseAppointmentDateTime(
        appointment.date,
        appointment.time
      );

      if (!appointmentDateTime) continue;

      const appointmentEndTime = new Date(
        appointmentDateTime.getTime() + 60 * 60 * 1000
      ); // +1 hour

      if (now >= appointmentEndTime) {
        await prisma.appointment.update({
          where: { id: appointment.id },
          data: { status: "completed" },
        });

        completedCount++;
        updatedCount++;
        console.log(
          `[CRON] Directly marked appointment ${appointment.id} as completed`
        );
      }
    }

    const summary = {
      timestamp: now.toISOString(),
      totalProcessed: upcomingAppointments.length + ongoingAppointments.length,
      totalUpdated: updatedCount,
      markedOngoing: ongoingCount,
      markedCompleted: completedCount,
      message: "Appointment status update completed successfully",
    };

    console.log(`[CRON] Summary:`, summary);

    return NextResponse.json(summary);
  } catch (error) {
    console.error("[CRON] Error updating appointment statuses:", error);

    return NextResponse.json(
      {
        error: "Failed to update appointment statuses",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Helper function to parse appointment date and time
function parseAppointmentDateTime(date: Date, time: string): Date | null {
  try {
    // Convert date to string in YYYY-MM-DD format
    const dateStr = date.toISOString().split("T")[0];

    // Parse time (assuming format like "2:30 PM" or "14:30")
    let hours: number, minutes: number;

    if (time.includes("AM") || time.includes("PM")) {
      // 12-hour format
      const [timePart, period] = time.split(" ");
      const [hourStr, minuteStr] = timePart.split(":");
      hours = parseInt(hourStr);
      minutes = parseInt(minuteStr) || 0;

      if (period.toUpperCase() === "PM" && hours !== 12) {
        hours += 12;
      } else if (period.toUpperCase() === "AM" && hours === 12) {
        hours = 0;
      }
    } else {
      // 24-hour format
      const [hourStr, minuteStr] = time.split(":");
      hours = parseInt(hourStr);
      minutes = parseInt(minuteStr) || 0;
    }

    const appointmentDateTime = new Date(
      `${dateStr}T${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:00.000Z`
    );

    return appointmentDateTime;
  } catch (error) {
    console.error(`[CRON] Error parsing date/time: ${date} ${time}`, error);
    return null;
  }
}

// For manual testing - you can remove this
export async function POST(request: NextRequest) {
  console.log("[CRON] Manual trigger received");
  return GET(request);
}
