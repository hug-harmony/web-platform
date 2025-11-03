// src/app/api/specialists/schedule/route.ts
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

  // Return full WorkingHour objects
  return blocks.map((b) => ({
    dayOfWeek: 0, // Will be set later
    startTime: minutesToTime(b.start),
    endTime: minutesToTime(b.end),
  }));
};

/* ---------- GET ---------- */
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

  const start = new Date(startDate);
  const end = new Date(endDate);

  try {
    /* ---- 1. BOOKED APPOINTMENTS + 30-MIN BUFFERS ---- */
    const appointments: Appointment[] = await prisma.appointment.findMany({
      where: {
        specialistId,
        OR: [{ startTime: { lt: end }, endTime: { gt: start } }],
        status: { in: ["upcoming", "pending", "break"] },
      },
      select: { id: true, startTime: true, endTime: true },
    });

    const events: Event[] = [];
    const byDay = new Map<string, Appointment[]>();

    appointments.forEach((a) => {
      const key = a.startTime.toISOString().split("T")[0];
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key)!.push(a);
    });

    for (const [, dayAppts] of byDay) {
      // Fixed: Removed extra arrow function
      dayAppts.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

      dayAppts.forEach((a) => {
        events.push({
          id: a.id,
          title: "Booked",
          start: a.startTime,
          end: a.endTime,
        });
      });

      for (let i = 0; i < dayAppts.length - 1; i++) {
        const cur = dayAppts[i];
        const bufStart = new Date(cur.endTime);
        const bufEnd = new Date(bufStart.getTime() + 30 * 60 * 1000);
        events.push({
          id: `buf-${cur.id}-${i}`,
          title: "Blocked (Buffer)",
          start: bufStart,
          end: bufEnd,
        });
      }
    }

    /* ---- 2. WORKING HOURS (per contiguous block) ---- */
    const weekly = await prisma.availability.findMany({
      where: { specialistId },
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
            dayOfWeek: dow, // Now correctly set
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
