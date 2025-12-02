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

const timeToMinutes = (time: string): number => {
  const trimmed = time.trim();
  const [timePart, period] = trimmed.split(" ");
  const [h, m] = timePart.split(":").map(Number);
  let hours24 = h;
  if (period === "PM" && h !== 12) hours24 += 12;
  if (period === "AM" && h === 12) hours24 = 0;
  return hours24 * 60 + (m ?? 0);
};

const minutesToTime = (mins: number): string => {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

const mergeContiguousSlots = (slots: string[]): WorkingHour[] => {
  if (!slots.length) return [];

  const mins = slots.map(timeToMinutes).sort((a, b) => a - b);
  const blocks: { start: number; end: number }[] = [];

  let curStart = mins[0];
  let curEnd = mins[0] + 30;

  for (let i = 1; i < mins.length; i++) {
    const next = mins[i];
    if (next <= curEnd) {
      curEnd = next + 30;
    } else {
      blocks.push({ start: curStart, end: curEnd });
      curStart = next;
      curEnd = next + 30;
    }
  }
  blocks.push({ start: curStart, end: curEnd });

  return blocks.map((b) => ({
    dayOfWeek: 0,
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
    /* ---- 1. FETCH ONLY REAL APPOINTMENTS (no "break" status) ---- */
    const appointments: Appointment[] = await prisma.appointment.findMany({
      where: {
        professionalId,
        startTime: { lt: end },
        endTime: { gt: start },
        status: { in: ["upcoming", "pending"] }, // ← Removed "break"
      },
      select: { id: true, startTime: true, endTime: true },
    });

    /* ---- 2. BUILD EVENTS WITH DYNAMIC BUFFERS ---- */
    const events: Event[] = [];

    // Sort all appointments by start time
    const sortedAppointments = [...appointments].sort(
      (a, b) => a.startTime.getTime() - b.startTime.getTime()
    );

    sortedAppointments.forEach((appointment, index) => {
      // Add the booked appointment event
      events.push({
        id: appointment.id,
        title: "Booked",
        start: appointment.startTime,
        end: appointment.endTime,
      });

      // Calculate buffer
      const bufferStart = new Date(appointment.endTime);
      const bufferEnd = new Date(
        bufferStart.getTime() + BUFFER_MINUTES * 60 * 1000
      );

      // Check if buffer overlaps with next appointment
      const nextAppointment = sortedAppointments[index + 1];

      if (nextAppointment) {
        // If next appointment starts before buffer ends, truncate buffer
        if (nextAppointment.startTime < bufferEnd) {
          // Only add buffer if there's actually a gap
          if (nextAppointment.startTime > bufferStart) {
            events.push({
              id: `buf-${appointment.id}`,
              title: "Blocked (Buffer)",
              start: bufferStart,
              end: nextAppointment.startTime, // Truncated buffer
            });
          }
          // If next appointment starts exactly at buffer start, no buffer shown
        } else {
          // Full buffer - no overlap with next appointment
          events.push({
            id: `buf-${appointment.id}`,
            title: "Blocked (Buffer)",
            start: bufferStart,
            end: bufferEnd,
          });
        }
      } else {
        // Last appointment of the day - always show full buffer
        events.push({
          id: `buf-${appointment.id}`,
          title: "Blocked (Buffer)",
          start: bufferStart,
          end: bufferEnd,
        });
      }
    });

    /* ---- 3. WORKING HOURS (unchanged) ---- */
    const weekly = await prisma.availability.findMany({
      where: { professionalId },
      select: { dayOfWeek: true, slots: true },
    });

    const workingHours: WorkingHour[] = [];
    const current = new Date(start);

    while (current <= end) {
      const dow = current.getDay();
      const rule = weekly.find((r) => r.dayOfWeek === dow);
      if (rule?.slots?.length) {
        const blocks = mergeContiguousSlots(rule.slots);
        blocks.forEach((b) => {
          workingHours.push({
            ...b,
            dayOfWeek: dow,
          });
        });
      }
      current.setDate(current.getDate() + 1);
    }

    return NextResponse.json({ events, workingHours }, { status: 200 });
  } catch (err) {
    console.error("Schedule fetch error:", err);
    return NextResponse.json(
      { error: "Failed to fetch schedule" },
      { status: 500 }
    );
  }
}
