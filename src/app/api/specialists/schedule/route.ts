/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// File: app/api/specialists/schedule/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const specialistId = searchParams.get("specialistId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (!specialistId || !startDate || !endDate) {
    return NextResponse.json(
      { error: "Missing specialistId, startDate, or endDate" },
      { status: 400 }
    );
  }

  try {
    const start = new Date(startDate);
    const end = new Date(endDate);

    // 1. Fetch booked appointments within the visible date range
    const bookedAppointments = await prisma.appointment.findMany({
      where: {
        specialistId: specialistId,
        // Find any appointments that overlap with the client's view
        OR: [
          {
            startTime: { lt: end },
            endTime: { gt: start },
          },
        ],
        status: { in: ["upcoming", "pending", "break"] },
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
      },
    });

    const events: any[] = [];

    // Group appointments by day (YYYY-MM-DD)
    const appointmentsByDay = new Map<string, typeof bookedAppointments>();

    bookedAppointments.forEach((appt) => {
      const dayKey = appt.startTime.toISOString().split("T")[0];
      if (!appointmentsByDay.has(dayKey)) {
        appointmentsByDay.set(dayKey, []);
      }
      appointmentsByDay.get(dayKey)!.push(appt);
    });

    // Process each day
    for (const [dayKey, appts] of appointmentsByDay) {
      // Sort by start time
      appts.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

      // Add actual bookings
      appts.forEach((appt) => {
        events.push({
          id: appt.id,
          title: "Booked",
          start: appt.startTime,
          end: appt.endTime,
        });
      });

      // Add 30-min block after each session *except the last one*
      for (let i = 0; i < appts.length - 1; i++) {
        const current = appts[i];
        const blockStart = new Date(current.endTime);
        const blockEnd = new Date(blockStart.getTime() + 30 * 60 * 1000);

        events.push({
          id: `block-${current.id}-${i}`,
          title: "Blocked (Buffer)",
          start: blockStart,
          end: blockEnd,
        });
      }
    }

    // 2. Fetch the specialist's general availability rules to determine working hours
    const availabilities = await prisma.availability.findMany({
      where: {
        specialistId,
        date: {
          gte: start,
          lte: end,
        },
      },
      select: { date: true, slots: true },
    });

    // Helper to convert "9:00 AM" to a comparable number
    const timeToMinutes = (time: string): number => {
      const [hourStr, period] = time.split(" ");
      let [hour] = hourStr.split(":").map(Number);
      if (period === "PM" && hour !== 12) hour += 12;
      if (period === "AM" && hour === 12) hour = 0; // Midnight case
      return hour * 60;
    };

    // Derive working hour boundaries (e.g., 9am-5pm) from the list of available slots
    const workingHours = availabilities
      .map((avail) => {
        if (!avail.slots || avail.slots.length === 0) return null;

        const dayOfWeek = new Date(avail.date).getUTCDay(); // 0 = Sunday, 1 = Monday, etc.

        // Sort slots by time to reliably find the first and last slot of the day
        const sortedSlots = [...avail.slots].sort(
          (a, b) => timeToMinutes(a as string) - timeToMinutes(b as string)
        );

        const firstSlot = sortedSlots[0] as string;
        const lastSlot = sortedSlots[sortedSlots.length - 1] as string;

        // Convert first slot to a "HH:mm" start time
        const startHour = Math.floor(timeToMinutes(firstSlot) / 60);
        const startTime = `${String(startHour).padStart(2, "0")}:00`;

        // The end time is the hour *after* the last available slot starts
        const endHour = Math.floor(timeToMinutes(lastSlot) / 60) + 1;
        const endTime = `${String(endHour).padStart(2, "0")}:00`;

        return { dayOfWeek, startTime, endTime };
      })
      .filter(
        (wh): wh is { dayOfWeek: number; startTime: string; endTime: string } =>
          wh !== null
      );

    // Remove duplicates to get a clean list of working hours per day of the week
    const uniqueWorkingHours = Array.from(
      new Map(workingHours.map((item) => [`${item.dayOfWeek}`, item])).values()
    );

    return NextResponse.json(
      {
        events,
        workingHours: uniqueWorkingHours,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Schedule fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch schedule" },
      { status: 500 }
    );
  }
}
