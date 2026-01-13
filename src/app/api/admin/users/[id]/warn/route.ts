// src/app/api/admin/users/[id]/warn/route.ts
// API endpoint for issuing warnings to users

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin status
    const adminUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { isAdmin: true },
    });

    if (!adminUser?.isAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: userId } = await params;

    try {
        const body = await request.json();
        const { reason, messageId, conversationId } = body;

        if (!reason) {
            return NextResponse.json(
                { error: "Warning reason is required" },
                { status: 400 }
            );
        }

        // Get the target user
        const targetUser = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
            },
        });

        if (!targetUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Create a note to track the warning
        await prisma.note.create({
            data: {
                authorId: session.user.id,
                targetUserId: userId,
                content: `[WARNING] ${reason}${messageId ? ` (Related to message: ${messageId})` : ""}${conversationId ? ` (Conversation: ${conversationId})` : ""}`,
            },
        });

        // Log the admin action
        console.log(
            `[ADMIN ACTION] Warning issued to user ${userId} by admin ${session.user.id}. Reason: ${reason}`
        );

        return NextResponse.json({
            success: true,
            message: "Warning issued successfully",
            user: {
                id: targetUser.id,
                name: `${targetUser.firstName} ${targetUser.lastName}`,
            },
            warningDetails: {
                reason,
                issuedAt: new Date().toISOString(),
                issuedBy: session.user.id,
                relatedMessageId: messageId || null,
                relatedConversationId: conversationId || null,
            },
        });
    } catch (error) {
        console.error("Admin warn user error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
