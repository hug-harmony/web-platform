import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    console.log("Session data:", session);
    if (!session?.user?.id) {
      console.error("Unauthorized: No session or user ID found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { conversationId, userId, date, time } = await req.json();
    console.log("Proposal request:", { conversationId, userId, date, time });

    if (!conversationId || !userId || !date || !time) {
      console.error("Missing required fields:", {
        conversationId,
        userId,
        date,
        time,
      });
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const specialist = await prisma.specialistApplication.findUnique({
      where: { userId: session.user.id },
    });
    console.log("Specialist status:", specialist);

    if (!specialist || specialist.status !== "approved") {
      console.error("Forbidden: User is not an approved specialist", {
        userId: session.user.id,
      });
      return NextResponse.json(
        { error: "Only approved specialists can send proposals" },
        { status: 403 }
      );
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { userId1: true, userId2: true },
    });
    if (
      !conversation ||
      ![conversation.userId1, conversation.userId2].includes(userId)
    ) {
      console.error("Invalid conversation or recipient:", {
        conversationId,
        userId,
      });
      return NextResponse.json(
        { error: "Invalid conversation or recipient" },
        { status: 400 }
      );
    }

    const proposal = await prisma.proposal.create({
      data: {
        specialistId: specialist.specialistId!,
        userId,
        conversationId,
        date: new Date(date),
        time,
        status: "pending",
      },
    });

    await prisma.message.create({
      data: {
        conversationId,
        senderId: session.user.id,
        recipientId: userId,
        text: `Session proposal: ${new Date(date).toLocaleDateString()} at ${time}`,
        isAudio: false,
        proposalId: proposal.id, // Associate message with proposal
      },
    });

    console.log("Proposal created:", proposal);
    return NextResponse.json(proposal, { status: 201 });
  } catch (error) {
    console.error("Error creating proposal:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversationId");

    if (!conversationId) {
      return NextResponse.json(
        { error: "Missing conversationId" },
        { status: 400 }
      );
    }

    const proposals = await prisma.proposal.findMany({
      where: { conversationId },
      include: { specialist: true },
    });

    return NextResponse.json(proposals, { status: 200 });
  } catch (error) {
    console.error("Error fetching proposals:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
