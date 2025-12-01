// app/api/professionals/availability/bulk/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

/**
 * GET /api/professionals/availability/bulk?date=2024-01-15
 *
 * Returns availability slots for ALL professionals on a specific date.
 * Used for filtering professionals by availability in the directory.
 */
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get("date");

  if (!dateStr) {
    return NextResponse.json(
      { error: "Missing 'date' parameter (format: YYYY-MM-DD)" },
      { status: 400 }
    );
  }

  // Parse the date and get day of week (0 = Sunday, 6 = Saturday)
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return NextResponse.json(
      { error: "Invalid date format. Use YYYY-MM-DD" },
      { status: 400 }
    );
  }

  const dayOfWeek = date.getDay();

  try {
    // Fetch all availability records for this day of week
    const availabilities = await prisma.availability.findMany({
      where: { dayOfWeek },
      select: {
        professionalId: true,
        slots: true,
        breakDuration: true,
      },
    });

    // Fetch booked appointments for this date to exclude those slots
    const startOfDay = new Date(dateStr);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(dateStr);
    endOfDay.setHours(23, 59, 59, 999);

    const bookedAppointments = await prisma.appointment.findMany({
      where: {
        startTime: { gte: startOfDay, lte: endOfDay },
        status: { in: ["upcoming", "pending", "break"] },
      },
      select: {
        professionalId: true,
        startTime: true,
        endTime: true,
      },
    });

    // Group booked times by professional
    const bookedByProfessional: Record<string, { start: Date; end: Date }[]> =
      {};
    bookedAppointments.forEach((appt) => {
      if (!bookedByProfessional[appt.professionalId]) {
        bookedByProfessional[appt.professionalId] = [];
      }
      bookedByProfessional[appt.professionalId].push({
        start: appt.startTime,
        end: appt.endTime,
      });
    });

    // Helper to convert slot time to Date for comparison
    const slotToDate = (slot: string, baseDate: Date): Date => {
      const [timePart, period] = slot.trim().split(" ");
      const [hours, minutes] = timePart.split(":").map(Number);

      let hour24 = hours;
      if (period === "PM" && hours !== 12) hour24 += 12;
      if (period === "AM" && hours === 12) hour24 = 0;

      const result = new Date(baseDate);
      result.setHours(hour24, minutes, 0, 0);
      return result;
    };

    // Filter out booked slots and format response
    const result = availabilities.map((avail) => {
      const booked = bookedByProfessional[avail.professionalId] || [];

      // Filter slots that are not booked
      const availableSlots = avail.slots.filter((slot) => {
        const slotStart = slotToDate(slot, startOfDay);
        const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000); // 30-min slots

        // Check if this slot overlaps with any booked appointment
        return !booked.some((b) => slotStart < b.end && slotEnd > b.start);
      });

      return {
        professionalId: avail.professionalId,
        slots: availableSlots,
        breakDuration: avail.breakDuration,
      };
    });

    return NextResponse.json({
      date: dateStr,
      dayOfWeek,
      availabilities: result,
    });
  } catch (error) {
    console.error("Bulk availability fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch availabilities" },
      { status: 500 }
    );
  }
}
