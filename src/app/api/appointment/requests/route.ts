import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma"; // Adjust path if needed
import { authOptions } from "@/lib/auth"; // Adjust path
import { z } from "zod";
import { format } from "date-fns";

const bodySchema = z.object({
  specialistId: z.string(),
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

  const body = bodySchema.parse(await req.json());

  try {
    // Find specialist and its linked userId via SpecialistApplication
    const specialistApp = await prisma.specialistApplication.findFirst({
      where: { specialistId: body.specialistId, status: "APPROVED" },
      include: { specialist: true },
    });
    if (!specialistApp || !specialistApp.userId || !specialistApp.specialist) {
      // UPDATED: Added !specialistApp.specialist check
      return NextResponse.json(
        { error: "Specialist not found or not approved" },
        { status: 404 }
      );
    }
    const specialist = specialistApp.specialist;
    const specialistUserId = specialistApp.userId;

    // Find or create conversation between current user and specialist's user
    let conversation = await prisma.conversation.findFirst({
      where: {
        OR: [
          { userId1: session.user.id, userId2: specialistUserId },
          { userId1: specialistUserId, userId2: session.user.id },
        ],
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          userId1: session.user.id,
          userId2: specialistUserId,
        },
      });
    }

    // Determine venue (similar to your /api/proposals/route.ts)
    let finalVenue: "host" | "visit" | undefined;
    if (specialist.venue === "both") {
      if (!body.venue) {
        return NextResponse.json(
          { error: "Venue required for 'both'" },
          { status: 400 }
        );
      }
      finalVenue = body.venue;
    } else {
      finalVenue = specialist.venue as "host" | "visit"; // Safe since venue isn't "both"
    }

    // Create proposal (appointment request)
    const proposal = await prisma.proposal.create({
      data: {
        specialistId: body.specialistId,
        userId: session.user.id, // Client/user is initiator
        conversationId: conversation.id,
        startTime: new Date(body.startTime),
        endTime: new Date(body.endTime),
        venue: finalVenue,
        status: "pending",
        initiator: "user", // Matches your /api/proposals/route.ts for user-initiated
      },
    });

    // Insert message into conversation (tailored text with range)
    const messageText = `Appointment request: ${format(new Date(body.startTime), "MMMM d, yyyy h:mm a")} to ${format(new Date(body.endTime), "h:mm a")}. Venue: ${finalVenue || "TBD"}. Please accept or decline.`;
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: session.user.id,
        recipientId: specialistUserId,
        text: messageText,
        isAudio: false,
        proposalId: proposal.id,
      },
    });

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
