import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { format } from "date-fns";
import { z } from "zod";

const bodySchema = z.object({
  status: z.enum(["accepted", "rejected"]),
  venue: z.enum(["host", "visit"]).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { status: action, venue } = bodySchema.parse(await req.json());

  try {
    const proposal = await prisma.proposal.findUnique({
      where: { id },
      include: { conversation: true, user: true, specialist: true },
    });

    if (!proposal) {
      return NextResponse.json(
        { error: "Proposal not found" },
        { status: 404 }
      );
    }

    if (proposal.status !== "pending") {
      return NextResponse.json(
        { error: `Proposal already ${proposal.status}` },
        { status: 409 }
      );
    }

    const specialistApp = await prisma.specialistApplication.findFirst({
      where: { specialistId: proposal.specialistId, status: "approved" },
    });

    const isUserResponder = proposal.initiator === "specialist";
    const isValidUpdater = isUserResponder
      ? proposal.userId === session.user.id
      : specialistApp?.userId === session.user.id;

    if (!isValidUpdater) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updatedProposal = await prisma.proposal.update({
      where: { id },
      data: { status: action },
    });

    const recipientId = isUserResponder
      ? proposal.userId
      : specialistApp?.userId;
    if (!recipientId) {
      return NextResponse.json(
        { error: "Recipient not found" },
        { status: 404 }
      );
    }

    let appointmentId: string | undefined;

    if (action === "accepted") {
      // UPDATED: Use proposal's venue if set, else body or specialist default
      let venueChoice: "host" | "visit" =
        proposal.venue || venue || proposal.specialist.venue;
      if (proposal.specialist.venue === "both" && !venueChoice) {
        return NextResponse.json(
          { error: "Venue is required" },
          { status: 400 }
        );
      }

      // UPDATED: Use exact startTime/endTime from proposal (no hardcoded duration)
      const appointment = await prisma.appointment.create({
        data: {
          userId: proposal.userId,
          specialistId: proposal.specialistId,
          startTime: proposal.startTime,
          endTime: proposal.endTime,
          status: "pending", // UPDATED: "pending" for payment
          venue: venueChoice,
          rate: proposal.specialist.rate, // Assume rate is available
        },
      });
      appointmentId = appointment.id;

      // UPDATED: Notification with range
      const notifyText = isUserResponder
        ? `Your proposal for ${format(proposal.startTime, "MMMM d, yyyy h:mm a")} to ${format(proposal.endTime, "h:mm a")} has been accepted. Proceed to payment.`
        : `Your appointment request for ${format(proposal.startTime, "MMMM d, yyyy h:mm a")} to ${format(proposal.endTime, "h:mm a")} has been accepted.`;

      await prisma.message.create({
        data: {
          conversationId: proposal.conversationId,
          senderId: session.user.id,
          recipientId,
          text: notifyText,
          isAudio: false,
          proposalId: proposal.id,
        },
      });
    } else {
      // UPDATED: Rejection with range
      const rejectText = isUserResponder
        ? `Your proposal for ${format(proposal.startTime, "MMMM d, yyyy h:mm a")} to ${format(proposal.endTime, "h:mm a")} has been rejected.`
        : `Your appointment request for ${format(proposal.startTime, "MMMM d, yyyy h:mm a")} to ${format(proposal.endTime, "h:mm a")} has been declined.`;

      await prisma.message.create({
        data: {
          conversationId: proposal.conversationId,
          senderId: session.user.id,
          recipientId,
          text: rejectText,
          isAudio: false,
          proposalId: proposal.id,
        },
      });
    }

    return NextResponse.json(
      { proposal: updatedProposal, appointmentId },
      { status: 200 }
    );
  } catch (error) {
    console.error("Update proposal status error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
