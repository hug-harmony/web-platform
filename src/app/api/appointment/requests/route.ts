// src/app/api/appointment/requests/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { format } from "date-fns";
import { sendAppointmentRequestEmail } from "@/lib/services/email";

const bodySchema = z.object({
  professionalId: z.string(),
  startTime: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), { message: "Invalid startTime" }),
  endTime: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), { message: "Invalid endTime" }),
  venue: z.enum(["host", "visit"]).optional(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = bodySchema.parse(await req.json());
  } catch (error) {
    console.error("Invalid appointment request data:", error);
    return NextResponse.json(
      { error: "Invalid request data" },
      { status: 400 }
    );
  }

  try {
    // Get professional with user info
    const professionalApp = await prisma.professionalApplication.findFirst({
      where: { professionalId: body.professionalId, status: "APPROVED" },
      include: {
        professional: true,
        user: {
          select: { email: true, firstName: true, lastName: true, name: true },
        },
      },
    });

    if (
      !professionalApp ||
      !professionalApp.userId ||
      !professionalApp.professional
    ) {
      return NextResponse.json(
        { error: "Professional not found or not approved" },
        { status: 404 }
      );
    }

    const professional = professionalApp.professional;
    const professionalUser = professionalApp.user;
    const professionalUserId = professionalApp.userId;

    // Get client info
    const client = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { firstName: true, lastName: true, name: true },
    });

    const clientName =
      client?.name ||
      `${client?.firstName || ""} ${client?.lastName || ""}`.trim() ||
      "Client";

    // Find or create conversation
    let conversation = await prisma.conversation.findFirst({
      where: {
        OR: [
          { userId1: session.user.id, userId2: professionalUserId },
          { userId1: professionalUserId, userId2: session.user.id },
        ],
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          userId1: session.user.id,
          userId2: professionalUserId,
        },
      });
    }

    // Determine venue
    let finalVenue: "host" | "visit" | undefined;
    if (professional.venue === "both") {
      if (!body.venue) {
        return NextResponse.json(
          { error: "Venue required for 'both'" },
          { status: 400 }
        );
      }
      finalVenue = body.venue;
    } else {
      finalVenue = professional.venue as "host" | "visit";
    }

    const startDate = new Date(body.startTime);
    const endDate = new Date(body.endTime);

    // Create proposal
    const proposal = await prisma.proposal.create({
      data: {
        professionalId: body.professionalId,
        userId: session.user.id,
        conversationId: conversation.id,
        startTime: startDate,
        endTime: endDate,
        venue: finalVenue,
        status: "pending",
        initiator: "user",
      },
    });

    // Create message
    const messageText = `📅 Appointment request: ${format(startDate, "MMMM d, yyyy h:mm a")} to ${format(endDate, "h:mm a")}. Venue: ${finalVenue || "TBD"}. Please accept or decline.`;

    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: session.user.id,
        recipientId: professionalUserId,
        text: messageText,
        isAudio: false,
        proposalId: proposal.id,
      },
    });

    // Send email notification to professional (non-blocking)
    if (professionalUser.email) {
      const durationMs = endDate.getTime() - startDate.getTime();
      const durationHours = durationMs / (1000 * 60 * 60);
      const amount = `$${((professional.rate || 0) * durationHours).toFixed(2)}`;
      const duration = `${durationHours.toFixed(1)} hour${durationHours !== 1 ? "s" : ""}`;
      const venueLabel =
        finalVenue === "host" ? "Professional's Location" : "Client's Location";

      const professionalName =
        professionalUser.name ||
        `${professionalUser.firstName || ""} ${professionalUser.lastName || ""}`.trim() ||
        professional.name ||
        "Professional";

      sendAppointmentRequestEmail(
        professionalUser.email,
        professionalName,
        clientName,
        format(startDate, "MMMM d, yyyy"),
        format(startDate, "h:mm a") + " - " + format(endDate, "h:mm a"),
        duration,
        amount,
        venueLabel,
        conversation.id
      ).catch((err) => console.error("Failed to send request email:", err));
    }

    return NextResponse.json(
      {
        success: true,
        proposalId: proposal.id,
        conversationId: conversation.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create appointment request error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
