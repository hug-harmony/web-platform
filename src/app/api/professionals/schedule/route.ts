// src/app/api/professionals/schedule/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

interface Appointment {
  id: string;
  startTime: Date;
  endTime: Date;
}

interface Event {
  id: string;
  title: string;
  start: Date;
  end: Date;
}

interface WorkingHour {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

/* ---------- helpers ---------- */
const BUFFER_MINUTES = 30;
const SLOT_DURATION = 30; // Each slot is 30 minutes

/**
 * Convert time string like "12:00 AM", "1:30 PM" to minutes since midnight
 */
const timeToMinutes = (time: string): number => {
  const trimmed = time.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

  if (!match) {
    console.error(`Invalid time format: ${time}`);
    return 0;
  }

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();

  // Convert to 24-hour format
  if (period === "AM") {
    if (hours === 12) hours = 0; // 12:00 AM = 00:00
  } else {
    // PM
    if (hours !== 12) hours += 12; // 1:00 PM = 13:00, but 12:00 PM = 12:00
  }

  return hours * 60 + minutes;
};

/**
 * Convert minutes since midnight to "HH:MM" format
 */
const minutesToTime = (mins: number): string => {
  // Handle 24:00 (midnight next day) as "24:00" for end times
  if (mins >= 1440) {
    return "24:00";
  }
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

/**
 * Merge contiguous time slots into working hour blocks
 * e.g., ["12:00 AM", "12:30 AM", "1:00 AM"] -> [{ startTime: "00:00", endTime: "01:30" }]
 */
const mergeContiguousSlots = (
  slots: string[]
): Omit<WorkingHour, "dayOfWeek">[] => {
  if (!slots || slots.length === 0) return [];

  // Convert all slots to minutes and sort
  const sortedMins = slots.map(timeToMinutes).sort((a, b) => a - b);

  // Remove duplicates
  const uniqueMins = [...new Set(sortedMins)];

  if (uniqueMins.length === 0) return [];

  const blocks: { start: number; end: number }[] = [];

  let blockStart = uniqueMins[0];
  let blockEnd = uniqueMins[0] + SLOT_DURATION;

  for (let i = 1; i < uniqueMins.length; i++) {
    const currentSlotStart = uniqueMins[i];

    // Check if this slot is contiguous with the current block
    // A slot is contiguous if it starts exactly where the previous slot ends
    if (currentSlotStart === blockEnd) {
      // Extend the current block
      blockEnd = currentSlotStart + SLOT_DURATION;
    } else if (currentSlotStart < blockEnd) {
      // Overlapping slot (shouldn't happen, but handle it)
      blockEnd = Math.max(blockEnd, currentSlotStart + SLOT_DURATION);
    } else {
      // Gap detected - save current block and start new one
      blocks.push({ start: blockStart, end: blockEnd });
      blockStart = currentSlotStart;
      blockEnd = currentSlotStart + SLOT_DURATION;
    }
  }

  // Don't forget the last block
  blocks.push({ start: blockStart, end: blockEnd });

  // Convert to WorkingHour format
  return blocks.map((b) => ({
    startTime: minutesToTime(b.start),
    endTime: minutesToTime(b.end),
  }));
};

/* ---------- GET ---------- */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const professionalId = searchParams.get("professionalId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (!professionalId || !startDate || !endDate) {
    return NextResponse.json(
      { error: "Missing professionalId, startDate, or endDate" },
      { status: 400 }
    );
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  try {
    /* ---- 1. FETCH ONLY REAL APPOINTMENTS ---- */
    const appointments: Appointment[] = await prisma.appointment.findMany({
      where: {
        professionalId,
        startTime: { lt: end },
        endTime: { gt: start },
        status: { in: ["upcoming", "pending"] },
      },
      select: { id: true, startTime: true, endTime: true },
    });

    /* ---- 2. BUILD EVENTS WITH DYNAMIC BUFFERS ---- */
    const events: Event[] = [];

    const sortedAppointments = [...appointments].sort(
      (a, b) => a.startTime.getTime() - b.startTime.getTime()
    );

    sortedAppointments.forEach((appointment, index) => {
      events.push({
        id: appointment.id,
        title: "Booked",
        start: appointment.startTime,
        end: appointment.endTime,
      });

      const bufferStart = new Date(appointment.endTime);
      const bufferEnd = new Date(
        bufferStart.getTime() + BUFFER_MINUTES * 60 * 1000
      );

      const nextAppointment = sortedAppointments[index + 1];

      if (nextAppointment) {
        if (nextAppointment.startTime < bufferEnd) {
          if (nextAppointment.startTime > bufferStart) {
            events.push({
              id: `buf-${appointment.id}`,
              title: "Blocked (Buffer)",
              start: bufferStart,
              end: nextAppointment.startTime,
            });
          }
        } else {
          events.push({
            id: `buf-${appointment.id}`,
            title: "Blocked (Buffer)",
            start: bufferStart,
            end: bufferEnd,
          });
        }
      } else {
        events.push({
          id: `buf-${appointment.id}`,
          title: "Blocked (Buffer)",
          start: bufferStart,
          end: bufferEnd,
        });
      }
    });

    /* ---- 3. WORKING HOURS ---- */
    const weekly = await prisma.availability.findMany({
      where: { professionalId },
      select: { dayOfWeek: true, slots: true },
    });

    // Debug log to see what's being fetched
    console.log("Weekly availability:", JSON.stringify(weekly, null, 2));

    const workingHours: WorkingHour[] = [];
    const current = new Date(start);

    while (current <= end) {
      const dow = current.getDay();
      const rule = weekly.find((r) => r.dayOfWeek === dow);

      if (rule?.slots && rule.slots.length > 0) {
        const blocks = mergeContiguousSlots(rule.slots);

        // Debug log
        console.log(
          `Day ${dow}: ${rule.slots.length} slots -> ${blocks.length} blocks`,
          blocks
        );

        blocks.forEach((block) => {
          workingHours.push({
            dayOfWeek: dow,
            startTime: block.startTime,
            endTime: block.endTime,
          });
        });
      }

      current.setDate(current.getDate() + 1);
    }

    // Debug log final working hours
    console.log("Final working hours:", JSON.stringify(workingHours, null, 2));

    return NextResponse.json({ events, workingHours }, { status: 200 });
  } catch (err) {
    console.error("Schedule fetch error:", err);
    return NextResponse.json(
      { error: "Failed to fetch schedule" },
      { status: 500 }
    );
  }
}
