// app/api/professionals/availability/bulk/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getBulkAvailability } from "@/lib/services/professionals";
import { bulkAvailabilityQuerySchema } from "@/lib/validations/professionals";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    const validation = bulkAvailabilityQuerySchema.safeParse({
      date: searchParams.get("date"),
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: "Missing or invalid 'date' parameter (format: YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    const { date } = validation.data;
    const dayOfWeek = new Date(date).getDay();
    const availabilityMap = await getBulkAvailability(date);

    // Transform to array format
    const availabilities = Object.entries(availabilityMap).map(
      ([professionalId, slots]) => ({
        professionalId,
        slots,
        breakDuration: 30, // Default, could be included in the map if needed
      })
    );

    return NextResponse.json({
      date,
      dayOfWeek,
      availabilities,
    });
  } catch (error) {
    console.error("Bulk availability error:", error);
    return NextResponse.json(
      { error: "Failed to fetch availabilities" },
      { status: 500 }
    );
  }
}
