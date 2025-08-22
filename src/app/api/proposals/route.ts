import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, Proposal } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

const prisma = new PrismaClient();

// Extend Proposal type to include relations
type ProposalWithRelations = Proposal & {
  user: { name: string | null };
  specialist: { name: string; rate: number | null };
};

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role") || "user";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const userId = session.user.id;

    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const specialistApp = await prisma.specialistApplication.findUnique({
      where: { userId },
      select: { status: true, specialistId: true },
    });
    const isSpecialist =
      specialistApp?.status === "approved" && specialistApp?.specialistId;

    if (role === "specialist" && !isSpecialist) {
      return NextResponse.json(
        { error: "Forbidden: Not a specialist" },
        { status: 403 }
      );
    }

    const whereClause =
      role === "specialist"
        ? { specialistId: specialistApp!.specialistId!, date: dateFilter } // Sent proposals
        : { userId, date: dateFilter }; // Received proposals

    const proposals = await prisma.proposal.findMany({
      where: whereClause,
      include: {
        user: { select: { name: true } },
        specialist: { select: { name: true, rate: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      proposals: proposals.map((p: ProposalWithRelations) => ({
        id: p.id,
        userId: p.userId,
        specialistId: p.specialistId,
        conversationId: p.conversationId,
        date: p.date,
        time: p.time,
        status: p.status,
        user: { name: p.user.name || "User" },
        specialist: { name: p.specialist.name, rate: p.specialist.rate || 0 },
      })),
      isSpecialist,
    });
  } catch (error) {
    console.error("Error fetching proposals:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { conversationId, userId, date, time } = await req.json();
    if (!conversationId || !userId || !date || !time) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const specialist = await prisma.specialistApplication.findUnique({
      where: { userId: session.user.id },
      select: { status: true, specialistId: true },
    });
    if (
      !specialist ||
      specialist.status !== "approved" ||
      !specialist.specialistId
    ) {
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
      return NextResponse.json(
        { error: "Invalid conversation or recipient" },
        { status: 400 }
      );
    }

    const proposal = await prisma.proposal.create({
      data: {
        specialistId: specialist.specialistId,
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
        proposalId: proposal.id,
      },
    });

    return NextResponse.json(proposal, { status: 201 });
  } catch (error) {
    console.error("Error creating proposal:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
