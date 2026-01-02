// src/app/api/notifications/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDocClient, TABLES } from "@/lib/aws/clients";
import {
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";

/**
 * Helper to find notification by ID using GSI
 */
async function findNotificationById(notificationId: string, userId: string) {
  const docClient = getDocClient();

  const command = new QueryCommand({
    TableName: TABLES.NOTIFICATIONS,
    IndexName: "ByIdIndex",
    KeyConditionExpression: "id = :id",
    ExpressionAttributeValues: {
      ":id": notificationId,
    },
  });

  const result = await docClient.send(command);
  const notification = result.Items?.[0];

  // Verify ownership
  if (notification && notification.userId !== userId) {
    return null;
  }

  return notification || null;
}

/**
 * GET - Get single notification
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const notification = await findNotificationById(id, session.user.id);

    if (!notification) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ notification });
  } catch (error) {
    console.error("Error fetching notification:", error);
    return NextResponse.json(
      { error: "Failed to fetch notification" },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Update notification (mark as read/unread)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { unread } = body;

    const notification = await findNotificationById(id, session.user.id);

    if (!notification) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    const docClient = getDocClient();

    const command = new UpdateCommand({
      TableName: TABLES.NOTIFICATIONS,
      Key: {
        userId: session.user.id,
        timestamp: notification.timestamp,
      },
      UpdateExpression: "SET unread = :unread, unreadBool = :unreadBool",
      ExpressionAttributeValues: {
        ":unread": unread ? "true" : "false",
        ":unreadBool": unread ?? false,
      },
      ReturnValues: "ALL_NEW",
    });

    const result = await docClient.send(command);

    return NextResponse.json({ notification: result.Attributes });
  } catch (error) {
    console.error("Error updating notification:", error);
    return NextResponse.json(
      { error: "Failed to update notification" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete notification
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const notification = await findNotificationById(id, session.user.id);

    if (!notification) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    const docClient = getDocClient();

    const command = new DeleteCommand({
      TableName: TABLES.NOTIFICATIONS,
      Key: {
        userId: session.user.id,
        timestamp: notification.timestamp,
      },
    });

    await docClient.send(command);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting notification:", error);
    return NextResponse.json(
      { error: "Failed to delete notification" },
      { status: 500 }
    );
  }
}
