// src/app/api/admin/users/[id]/ban/route.ts
// API endpoint for banning users (permanent suspension)

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
                { error: "Ban reason is required" },
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
                isAdmin: true,
            },
        });

        if (!targetUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Prevent banning admins
        if (targetUser.isAdmin) {
            return NextResponse.json(
                { error: "Cannot ban an admin user" },
                { status: 400 }
            );
        }

        // Update user status to banned (using existing status field)
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                status: "banned",
            },
        });

        // Create a note to track the ban
        await prisma.note.create({
            data: {
                authorId: session.user.id,
                targetUserId: userId,
                content: `[BANNED] ${reason}${messageId ? ` (Related to message: ${messageId})` : ""}${conversationId ? ` (Conversation: ${conversationId})` : ""}`,
            },
        });

        // Log the admin action
        console.log(
            `[ADMIN ACTION] User ${userId} banned by admin ${session.user.id}. Reason: ${reason}`
        );

        return NextResponse.json({
            success: true,
            message: "User banned successfully",
            user: {
                id: updatedUser.id,
                status: "banned",
            },
            banDetails: {
                reason,
                bannedAt: new Date().toISOString(),
                bannedBy: session.user.id,
                relatedMessageId: messageId || null,
                relatedConversationId: conversationId || null,
            },
        });
    } catch (error) {
        console.error("Admin ban user error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// Unban user
export async function DELETE(
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
        // Get the target user
        const targetUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, status: true },
        });

        if (!targetUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        if (targetUser.status !== "banned") {
            return NextResponse.json(
                { error: "User is not banned" },
                { status: 400 }
            );
        }

        // Update user status to active
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                status: "active",
            },
        });

        // Create a note to track the unban
        await prisma.note.create({
            data: {
                authorId: session.user.id,
                targetUserId: userId,
                content: `[UNBANNED] Account ban has been lifted.`,
            },
        });

        // Log the admin action
        console.log(
            `[ADMIN ACTION] User ${userId} unbanned by admin ${session.user.id}`
        );

        return NextResponse.json({
            success: true,
            message: "User unbanned successfully",
            user: {
                id: updatedUser.id,
                status: "active",
            },
        });
    } catch (error) {
        console.error("Admin unban user error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
