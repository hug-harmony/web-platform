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
        initiator: p.initiator,
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

    const body = await req.json();
    let conversationId: string;
    let recipientId: string;
    let specialistId: string | undefined;
    let userId: string | undefined;
    const date = new Date(body.date);
    const time = body.time;

    if (!date || !time) {
      return NextResponse.json(
        { error: "Missing required fields: date or time" },
        { status: 400 }
      );
    }

    const isSpecialist = await prisma.specialistApplication.findFirst({
      where: { userId: session.user.id, status: "approved" },
      select: { specialistId: true },
    });

    if (isSpecialist && isSpecialist.specialistId) {
      // Specialist-initiated proposal
      conversationId = body.conversationId;
      userId = body.userId; // Recipient user
      specialistId = isSpecialist.specialistId;
      recipientId = userId;
      if (!conversationId || !userId) {
        return NextResponse.json(
          { error: "Missing conversationId or userId for specialist proposal" },
          { status: 400 }
        );
      }
    } else {
      // User-initiated appointment request
      conversationId = body.conversationId;
      specialistId = body.specialistId; // Recipient specialist
      userId = session.user.id;
      recipientId =
        (
          await prisma.specialistApplication.findFirst({
            where: { specialistId, status: "approved" },
          })
        )?.userId || ""; // Get specialist's user ID for recipient
      if (!conversationId || !specialistId || !recipientId) {
        return NextResponse.json(
          { error: "Missing conversationId or specialistId for user request" },
          { status: 400 }
        );
      }
    }

    // Verify conversation
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { userId1: true, userId2: true },
    });
    if (
      !conversation ||
      ![conversation.userId1, conversation.userId2].includes(recipientId) ||
      ![conversation.userId1, conversation.userId2].includes(session.user.id)
    ) {
      return NextResponse.json(
        { error: "Invalid conversation" },
        { status: 400 }
      );
    }

    // NO AVAILABILITY CHECK: Per spec, allow any timeslot (specialist regardless; extended to user requests)

    const proposal = await prisma.proposal.create({
      data: {
        specialistId: specialistId!,
        userId: userId!,
        conversationId,
        date,
        time,
        status: "pending",
        initiator: isSpecialist ? "specialist" : "user", // Set based on initiator
      },
    });

    // Tailored message based on initiator
    const messageText = isSpecialist
      ? `Session proposal: ${date.toLocaleDateString()} at ${time}. Please accept or reject.`
      : `Appointment request: ${date.toLocaleDateString()} at ${time}. Please accept or decline.`;

    await prisma.message.create({
      data: {
        conversationId,
        senderId: session.user.id,
        recipientId,
        text: messageText,
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
