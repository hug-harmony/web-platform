// app/api/professionals/availability/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getProfessionalAvailability,
  updateProfessionalAvailability,
} from "@/lib/services/professionals";
import {
  availabilityQuerySchema,
  updateAvailabilitySchema,
} from "@/lib/validations/professionals";
import prisma from "@/lib/prisma";
import { allSlots } from "@/lib/constants";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const validation = availabilityQuerySchema.safeParse({
      professionalId: searchParams.get("professionalId"),
      dayOfWeek: searchParams.get("dayOfWeek"),
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: "Missing or invalid professionalId or dayOfWeek" },
        { status: 400 }
      );
    }

    const { professionalId, dayOfWeek } = validation.data;
    const availability = await getProfessionalAvailability(
      professionalId,
      dayOfWeek
    );

    return NextResponse.json(availability);
  } catch (error) {
    console.error("GET availability error:", error);
    return NextResponse.json(
      { error: "Failed to fetch availability" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is an approved professional
    const app = await prisma.professionalApplication.findUnique({
      where: { userId: session.user.id },
      select: { status: true, professionalId: true },
    });

    if (!app || app.status !== "APPROVED" || !app.professionalId) {
      return NextResponse.json(
        { error: "Not an approved professional" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = updateAvailabilitySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validation.error.format() },
        { status: 400 }
      );
    }

    const { dayOfWeek, slots, breakDuration } = validation.data;

    // Validate slots
    const invalidSlots = slots.filter((s) => !allSlots.includes(s));
    if (invalidSlots.length > 0) {
      return NextResponse.json(
        { error: `Invalid slots: ${invalidSlots.join(", ")}` },
        { status: 400 }
      );
    }

    await updateProfessionalAvailability(
      app.professionalId,
      dayOfWeek,
      slots,
      breakDuration
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST availability error:", error);
    return NextResponse.json(
      { error: "Failed to save availability" },
      { status: 500 }
    );
  }
}
