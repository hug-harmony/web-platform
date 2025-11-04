import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  adjustedRate: z.number().min(0),
  note: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { adjustedRate, note } = schema.parse(body);

    const appt = await prisma.appointment.findUnique({
      where: { id },
      select: {
        specialistId: true,
        rate: true,
        adjustedRate: true,
        modificationHistory: true,
        adminNotes: true,
      },
    });

    if (!appt) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    if (!session.user.isAdmin) {
      const specialistProfile = await prisma.specialistApplication.findFirst({
        where: { userId: session.user.id, status: "APPROVED" },
        select: { specialistId: true },
      });

      if (
        !specialistProfile ||
        specialistProfile.specialistId !== appt.specialistId
      ) {
        return NextResponse.json(
          {
            error:
              "Forbidden: You do not have permission to modify this appointment's rate.",
          },
          { status: 403 }
        );
      }
    }

    const prevHistory =
      appt.modificationHistory && typeof appt.modificationHistory === "object"
        ? appt.modificationHistory
        : {};

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        adjustedRate,
        modificationHistory: {
          ...prevHistory,
          [`rateChange_${new Date().toISOString()}`]: {
            oldRate: appt.adjustedRate ?? appt.rate,
            newRate: adjustedRate,
            note,
            changedBy: session.user.id,
          },
        },
        adminNotes: note
          ? `${appt.adminNotes || ""}\nRate Note: ${note}`.trim()
          : appt.adminNotes,
      },
    });

    return NextResponse.json({
      message: "Rate updated successfully",
      appointment: updated,
    });
  } catch (error) {
    console.error("Rate update error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
