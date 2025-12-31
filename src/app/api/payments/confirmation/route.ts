// src/app/api/payments/confirmation/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getPendingConfirmations,
  confirmAppointment,
  getConfirmationByAppointmentId,
  hasPendingConfirmations,
} from "@/lib/services/payments";
import prisma from "@/lib/prisma";
import { z } from "zod";

// GET query schema
const getQuerySchema = z.object({
  appointmentId: z.string().optional(),
  checkPending: z.enum(["true", "false"]).optional(),
});

// POST body schema
const confirmSchema = z.object({
  appointmentId: z.string().min(1, "Appointment ID is required"),
  confirmed: z.boolean(),
  review: z
    .object({
      rating: z.number().min(1).max(5),
      feedback: z.string().min(1).max(1000),
    })
    .optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const params = getQuerySchema.parse({
      appointmentId: searchParams.get("appointmentId") || undefined,
      checkPending: searchParams.get("checkPending") || undefined,
    });

    // Check if user just wants to know if they have pending confirmations
    if (params.checkPending === "true") {
      const hasPending = await hasPendingConfirmations(session.user.id);
      return NextResponse.json({ hasPending });
    }

    // Get specific confirmation by appointment ID
    if (params.appointmentId) {
      const confirmation = await getConfirmationByAppointmentId(
        params.appointmentId
      );

      if (!confirmation) {
        return NextResponse.json(
          { error: "Confirmation not found" },
          { status: 404 }
        );
      }

      // Verify user has access
      const isClient = confirmation.clientId === session.user.id;
      const isProfessional =
        confirmation.professionalUserId === session.user.id;
      const isAdmin = session.user.isAdmin;

      if (!isClient && !isProfessional && !isAdmin) {
        return NextResponse.json(
          { error: "You don't have permission to view this confirmation" },
          { status: 403 }
        );
      }

      return NextResponse.json(confirmation);
    }

    // Get all pending confirmations for this user
    // Determine user's role(s)
    const application = await prisma.professionalApplication.findUnique({
      where: { userId: session.user.id },
      select: { professionalId: true, status: true },
    });

    const isProfessional =
      application?.status === "APPROVED" && application.professionalId;

    // Get confirmations for both roles if applicable
    const [clientConfirmations, professionalConfirmations] = await Promise.all([
      getPendingConfirmations(session.user.id, "client"),
      isProfessional
        ? getPendingConfirmations(session.user.id, "professional")
        : Promise.resolve([]),
    ]);

    return NextResponse.json({
      asClient: clientConfirmations,
      asProfessional: professionalConfirmations,
      total: clientConfirmations.length + professionalConfirmations.length,
    });
  } catch (error) {
    console.error("GET confirmations error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
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

    const body = await request.json();
    const { appointmentId, confirmed, review } = confirmSchema.parse(body);

    // Get the confirmation to determine user's role
    const confirmation = await getConfirmationByAppointmentId(appointmentId);

    if (!confirmation) {
      return NextResponse.json(
        {
          error:
            "Confirmation not found. The appointment may not be completed yet.",
        },
        { status: 404 }
      );
    }

    // Determine user's role in this appointment
    let userRole: "client" | "professional";

    if (confirmation.clientId === session.user.id) {
      userRole = "client";
    } else if (confirmation.professionalUserId === session.user.id) {
      userRole = "professional";
    } else {
      return NextResponse.json(
        { error: "You are not a participant in this appointment" },
        { status: 403 }
      );
    }

    // Professionals cannot leave reviews
    if (userRole === "professional" && review) {
      return NextResponse.json(
        { error: "Only clients can leave reviews" },
        { status: 400 }
      );
    }

    // Process the confirmation
    const result = await confirmAppointment(
      {
        appointmentId,
        oderId: session.user.id,
        confirmed,
        reviewData: review,
      },
      session.user.id,
      userRole
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("POST confirmation error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
