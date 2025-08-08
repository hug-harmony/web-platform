// src/app/api/appointment/[id]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bookingId = new URL(request.url).pathname.split("/").pop();

  if (!bookingId || bookingId === "undefined") {
    return NextResponse.json({ error: "Invalid booking ID" }, { status: 400 });
  }

  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: bookingId },
      include: {
        user: { select: { name: true } },
        specialist: { select: { name: true, rate: true } },
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        userName: appointment.user.name,
        therapistName: appointment.specialist.name,
        date: appointment.date,
        time: appointment.time,
        amount: appointment.specialist.rate || 50,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Booking details error:", error);
    return NextResponse.json(
      { error: "Failed to fetch booking details" },
      { status: 500 }
    );
  }
}
