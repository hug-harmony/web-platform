import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { format } from "date-fns";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { status: action } = await req.json();
  if (!["accepted", "rejected"].includes(action)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  try {
    const proposal = await prisma.proposal.findUnique({
      where: { id: params.id },
      include: { conversation: true, user: true, specialist: true },
    });
    if (!proposal) {
      return NextResponse.json(
        { error: "Proposal not found" },
        { status: 404 }
      );
    }

    // Validate updater based on initiator
    let isValidUpdater = false;
    if (proposal.initiator === "specialist") {
      // User (recipient) should update
      isValidUpdater = proposal.userId === session.user.id;
    } else {
      // Specialist (recipient) should update
      const specialistApp = await prisma.specialistApplication.findFirst({
        where: { specialistId: proposal.specialistId, status: "approved" },
      });
      isValidUpdater = specialistApp?.userId === session.user.id;
    }

    if (!isValidUpdater) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Update status
    const updatedProposal = await prisma.proposal.update({
      where: { id: params.id },
      data: { status: action },
    });

    let appointmentId: string | undefined;

    // figure out recipient (used for notifications)
    const specialistApp = await prisma.specialistApplication.findFirst({
      where: { specialistId: proposal.specialistId },
    });

    const recipientId =
      proposal.initiator === "specialist"
        ? proposal.userId
        : specialistApp?.userId;

    if (!recipientId) {
      return NextResponse.json(
        { error: "Recipient not found" },
        { status: 404 }
      );
    }

    if (action === "accepted") {
      // Create appointment
      const appointment = await prisma.appointment.create({
        data: {
          userId: proposal.userId,
          specialistId: proposal.specialistId,
          date: proposal.date,
          time: proposal.time,
          status: "upcoming",
        },
      });
      appointmentId = appointment.id;

      // Tailored notification message
      const notifyText =
        proposal.initiator === "specialist"
          ? `Your proposal for ${format(
              proposal.date,
              "MMMM d, yyyy"
            )} at ${proposal.time} has been accepted. Proceed to payment.`
          : `Your appointment request for ${format(
              proposal.date,
              "MMMM d, yyyy"
            )} at ${proposal.time} has been accepted.`;

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
      const rejectText =
        proposal.initiator === "specialist"
          ? `Your proposal for ${format(
              proposal.date,
              "MMMM d, yyyy"
            )} at ${proposal.time} has been rejected.`
          : `Your appointment request for ${format(
              proposal.date,
              "MMMM d, yyyy"
            )} at ${proposal.time} has been declined.`;

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
  } finally {
    await prisma.$disconnect();
  }
}
