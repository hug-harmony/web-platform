import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { format } from "date-fns";
import { z } from "zod";

const bodySchema = z.object({
  status: z.enum(["accepted", "rejected"]),
  // Optional: allow client to pass explicit venue when accepting
  venue: z.enum(["host", "visit"]).optional(),
});

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

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

    // Only allow updates from pending
    if (proposal.status !== "pending") {
      return NextResponse.json(
        { error: `Proposal already ${proposal.status}` },
        { status: 409 }
      );
    }

    // Validate updater based on initiator (recipient must respond)
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

    // Update proposal status
    const updatedProposal = await prisma.proposal.update({
      where: { id },
      data: { status: action },
    });

    // Determine recipient for notification
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
      // Determine appointment venue
      // Priority: body.venue > specialist.venue (if strict) > error if 'both' and none provided
      let venueChoice: "host" | "visit" | undefined = venue;

      if (!venueChoice) {
        if (
          proposal.specialist.venue === "host" ||
          proposal.specialist.venue === "visit"
        ) {
          venueChoice = proposal.specialist.venue;
        } else {
          // specialist.venue === 'both' but no specific selection provided
          return NextResponse.json(
            {
              error:
                "Venue is required when specialist supports both host and visit",
            },
            { status: 400 }
          );
        }
      }

      const appointment = await prisma.appointment.create({
        data: {
          userId: proposal.userId,
          specialistId: proposal.specialistId,
          date: proposal.date,
          time: proposal.time,
          status: "upcoming",
          venue: venueChoice,
        },
      });
      appointmentId = appointment.id;

      // Tailored notification message
      const notifyText = isUserResponder
        ? `Your proposal for ${format(proposal.date, "MMMM d, yyyy")} at ${
            proposal.time
          } has been accepted. Proceed to payment.`
        : `Your appointment request for ${format(proposal.date, "MMMM d, yyyy")} at ${
            proposal.time
          } has been accepted.`;

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
      // Rejection message
      const rejectText = isUserResponder
        ? `Your proposal for ${format(proposal.date, "MMMM d, yyyy")} at ${
            proposal.time
          } has been rejected.`
        : `Your appointment request for ${format(proposal.date, "MMMM d, yyyy")} at ${
            proposal.time
          } has been declined.`;

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
  // Note: don't disconnect Prisma in serverless handlers
}
