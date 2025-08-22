import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    console.log("Session data:", session);
    if (!session?.user?.id) {
      console.error("Unauthorized: No session or user ID found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { status } = await req.json();

    if (!id || !["accept", "reject"].includes(status)) {
      console.error("Invalid request:", { id, status });
      return NextResponse.json(
        { error: "Invalid proposal ID or status" },
        { status: 400 }
      );
    }

    const proposal = await prisma.proposal.findUnique({
      where: { id },
      include: { specialist: true },
    });
    if (!proposal) {
      console.error("Proposal not found:", id);
      return NextResponse.json(
        { error: "Proposal not found" },
        { status: 404 }
      );
    }

    if (proposal.userId !== session.user.id) {
      console.error("Forbidden: User is not the proposal recipient", {
        userId: session.user.id,
      });
      return NextResponse.json(
        { error: "You are not authorized to respond to this proposal" },
        { status: 403 }
      );
    }

    if (proposal.status !== "pending") {
      console.error("Invalid proposal status:", proposal.status);
      return NextResponse.json(
        { error: "Proposal is no longer pending" },
        { status: 400 }
      );
    }

    const updatedProposal = await prisma.proposal.update({
      where: { id },
      data: { status },
    });

    let appointment = null;
    if (status === "accept") {
      const therapist = await prisma.specialist.findUnique({
        where: { id: proposal.specialistId },
      });
      if (!therapist) {
        console.error("Therapist not found:", proposal.specialistId);
        return NextResponse.json(
          { error: "Therapist not found" },
          { status: 404 }
        );
      }

      const existingAppointment = await prisma.appointment.findFirst({
        where: {
          specialistId: proposal.specialistId,
          date: new Date(proposal.date),
          time: proposal.time,
        },
      });

      if (existingAppointment) {
        console.error("Time slot unavailable:", {
          date: proposal.date,
          time: proposal.time,
        });
        return NextResponse.json(
          { error: "Time slot unavailable" },
          { status: 409 }
        );
      }

      appointment = await prisma.appointment.create({
        data: {
          userId: proposal.userId,
          specialistId: proposal.specialistId,
          date: new Date(proposal.date),
          time: proposal.time,
          status: "upcoming",
        },
      });
      console.log("Appointment created:", appointment);

      await prisma.message.create({
        data: {
          conversationId: proposal.conversationId,
          senderId: session.user.id,
          recipientId: proposal.specialistId,
          text: `Proposal accepted: ${new Date(proposal.date).toLocaleDateString()} at ${proposal.time}`,
          isAudio: false,
          proposalId: proposal.id,
        },
      });
    } else {
      await prisma.message.create({
        data: {
          conversationId: proposal.conversationId,
          senderId: session.user.id,
          recipientId: proposal.specialistId,
          text: `Proposal rejected: ${new Date(proposal.date).toLocaleDateString()} at ${proposal.time}`,
          isAudio: false,
          proposalId: proposal.id,
        },
      });
    }

    console.log("Proposal updated:", updatedProposal);
    return NextResponse.json(
      {
        proposal: updatedProposal,
        appointmentId: appointment?.id,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating proposal:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
