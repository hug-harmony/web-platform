import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resolvedParams = await params;
  const bookingId = resolvedParams.id;

  if (!bookingId || bookingId === "undefined") {
    return NextResponse.json({ error: "Invalid booking ID" }, { status: 400 });
  }

  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        venue: true,
        user: { select: { name: true } },
        specialist: { select: { name: true, rate: true, venue: true } },
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (!appointment.user) {
      return NextResponse.json(
        { error: "User not found for this appointment" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        userName: appointment.user.name,
        therapistName: appointment.specialist.name,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        amount: appointment.specialist.rate || 50,
        venue: appointment.venue,
        specialistVenue: appointment.specialist.venue,
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
