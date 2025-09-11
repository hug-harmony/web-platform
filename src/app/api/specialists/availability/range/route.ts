// app/api/specialists/availability/range/route.ts
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

  const start = new Date(startDate);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setUTCHours(0, 0, 0, 0);

  if (start > end) {
    return NextResponse.json(
      { error: "Invalid date range: startDate cannot be after endDate" },
      { status: 400 }
    );
  }

  try {
    const availabilities = await prisma.availability.findMany({
      where: {
        specialistId,
        date: {
          gte: start,
          lte: end,
        },
      },
      select: {
        date: true,
        slots: true,
        breakDuration: true,
      },
    });

    const appointments = await prisma.appointment.findMany({
      where: {
        specialistId,
        date: {
          gte: start,
          lte: end,
        },
        status: { in: ["upcoming", "pending"] },
      },
      select: {
        date: true,
        time: true,
      },
    });

    const result = availabilities.map((avail) => {
      const bookedTimes = appointments
        .filter(
          (appt) =>
            appt.date.toISOString().split("T")[0] ===
            avail.date.toISOString().split("T")[0]
        )
        .map((appt) => appt.time);
      return {
        date: avail.date.toISOString().split("T")[0],
        slots: avail.slots.map((time: string) => ({
          time,
          available: !bookedTimes.includes(time),
        })),
        breakDuration: avail.breakDuration,
      };
    });

    // Fill in missing dates with empty availability
    const allDates: {
      date: string;
      slots: { time: string; available: boolean }[];
      breakDuration: number | null;
    }[] = [];
    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      const existing = result.find((avail) => avail.date === dateStr);
      if (!existing) {
        allDates.push({ date: dateStr, slots: [], breakDuration: null });
      } else {
        allDates.push(existing);
      }
    }

    return NextResponse.json({ availabilities: allDates }, { status: 200 });
  } catch (error) {
    console.error("Bulk availability fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch availability" },
      { status: 500 }
    );
  }
}
