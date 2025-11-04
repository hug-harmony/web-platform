import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, Proposal } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { format } from "date-fns"; // NEW: Import to fix TS2552 errors

const prisma = new PrismaClient();

// Extend Proposal type to include relations (now used in GET)
type ProposalWithRelations = Proposal & {
  user: { name: string | null };
  specialist: { name: string; rate: number | null };
};

/*
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
        ? { specialistId: specialistApp!.specialistId!, startTime: dateFilter } // UPDATED: Use startTime for filtering
        : { userId, startTime: dateFilter }; // UPDATED

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
        // UPDATED: Use ProposalWithRelations to fix no-explicit-any
        id: p.id,
        userId: p.userId,
        specialistId: p.specialistId,
        conversationId: p.conversationId,
        startTime: p.startTime,
        endTime: p.endTime,
        venue: p.venue,
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
  */

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
      specialistApp?.status === "APPROVED" && specialistApp?.specialistId;

    if (role === "specialist" && !isSpecialist) {
      return NextResponse.json(
        { error: "Forbidden: Not a specialist" },
        { status: 403 }
      );
    }

    const whereClause =
      role === "specialist"
        ? {
            specialistId: specialistApp!.specialistId!,
            startTime: { ...dateFilter, not: null },
          } // UPDATED: Add not: null to filter out nulls
        : { userId, startTime: { ...dateFilter, not: null } }; // UPDATED

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
        startTime: p.startTime, // Now can be null, but we filtered
        endTime: p.endTime,
        venue: p.venue,
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
    let specialistId: string;
    let userId: string;
    const startTime = new Date(body.startTime); // UPDATED: Use startTime/endTime
    const endTime = new Date(body.endTime);
    const venue = body.venue; // NEW: Venue from body

    if (
      !startTime ||
      !endTime ||
      startTime >= endTime ||
      startTime < new Date()
    ) {
      return NextResponse.json(
        { error: "Invalid time range" },
        { status: 400 }
      );
    }

    const isSpecialist = await prisma.specialistApplication.findFirst({
      where: { userId: session.user.id, status: "APPROVED" },
      select: { specialistId: true },
    });

    if (isSpecialist && isSpecialist.specialistId) {
      // Specialist-initiated proposal
      conversationId = body.conversationId;
      userId = body.userId; // Recipient user
      specialistId = isSpecialist.specialistId;

      if (!conversationId || !userId) {
        return NextResponse.json(
          { error: "Missing conversationId or userId for specialist proposal" },
          { status: 400 }
        );
      }

      recipientId = userId;
    } else {
      // User-initiated appointment request
      conversationId = body.conversationId;
      specialistId = body.specialistId; // Recipient specialist
      userId = session.user.id;

      if (!conversationId || !specialistId) {
        return NextResponse.json(
          { error: "Missing conversationId or specialistId for user request" },
          { status: 400 }
        );
      }

      const specialistUser = await prisma.specialistApplication.findFirst({
        where: { specialistId, status: "APPROVED" },
      });

      if (!specialistUser?.userId) {
        return NextResponse.json(
          { error: "Specialist not found" },
          { status: 404 }
        );
      }

      recipientId = specialistUser.userId;
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

    // NEW: Fetch specialist details for venue and rate
    const specialist = await prisma.specialist.findUnique({
      where: { id: specialistId },
      select: { venue: true, rate: true },
    });
    if (!specialist) {
      return NextResponse.json(
        { error: "Specialist not found" },
        { status: 404 }
      );
    }

    // NEW: Determine final venue
    let finalVenue: "host" | "visit" | undefined;
    if (specialist.venue === "both") {
      if (!venue)
        return NextResponse.json({ error: "Venue required" }, { status: 400 });
      finalVenue = venue;
    } else {
      finalVenue = specialist.venue as "host" | "visit"; // UPDATED: Type assertion to fix TS2367 (exclude "both" from type)
    }

    // NEW: Overlap check
    const overlapping = await prisma.appointment.findFirst({
      where: {
        specialistId,
        status: { in: ["upcoming", "pending", "break"] },
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    });
    if (overlapping) {
      return NextResponse.json(
        { error: "SLOT_ALREADY_BOOKED" },
        { status: 409 }
      );
    }

    // NEW: Buffer check (reuse logic from schedule/booking)
    const dayStart = new Date(startTime);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(startTime);
    dayEnd.setHours(23, 59, 59, 999);

    const dayAppointments = await prisma.appointment.findMany({
      where: {
        specialistId,
        status: { in: ["upcoming", "pending", "break"] },
        startTime: { gte: dayStart, lte: dayEnd },
      },
      orderBy: { startTime: "asc" },
    });

    let hasBufferViolation = false;
    for (let i = 0; i < dayAppointments.length - 1; i++) {
      const curr = dayAppointments[i];
      const bufferStart = new Date(curr.endTime);
      const bufferEnd = new Date(bufferStart.getTime() + 30 * 60 * 1000);
      if (startTime < bufferEnd && endTime > bufferStart) {
        hasBufferViolation = true;
        break;
      }
    }
    if (hasBufferViolation) {
      return NextResponse.json(
        { error: "INVALID_TIME_BUFFER" },
        { status: 409 }
      );
    }

    // REMOVED: Working hours check (as per user request; specialists can propose any time)

    const proposal = await prisma.proposal.create({
      data: {
        specialistId,
        userId,
        conversationId,
        startTime, // UPDATED
        endTime, // UPDATED
        venue: finalVenue, // NEW
        status: "pending",
        initiator: isSpecialist ? "specialist" : "user",
      },
    });

    // UPDATED: Tailored message with range
    const messageText = isSpecialist
      ? `Session proposal: ${format(startTime, "MMMM d, yyyy h:mm a")} to ${format(endTime, "h:mm a")}. Venue: ${finalVenue || "TBD"}. Please accept or reject.`
      : `Appointment request: ${format(startTime, "MMMM d, yyyy h:mm a")} to ${format(endTime, "h:mm a")}. Venue: ${finalVenue || "TBD"}. Please accept or decline.`;

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
