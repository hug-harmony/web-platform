// src/app/api/notifications/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDocClient, TABLES } from "@/lib/aws/clients";
import { QueryCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";

export type NotificationType =
  | "message"
  | "appointment"
  | "payment"
  | "profile_visit"
  | "video_call";

export interface Notification {
  id: string;
  userId: string;
  senderId?: string;
  type: NotificationType;
  content: string;
  timestamp: string;
  unread: string;
  unreadBool: boolean;
  relatedId?: string;
  ttl?: number;
}

/**
 * GET - Fetch user's notifications
 * Supports filtering by type and unread status using GSIs
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const type = searchParams.get("type") as NotificationType | null;

    const docClient = getDocClient();
    let notifications: Notification[] = [];

    if (unreadOnly) {
      // Use UnreadIndex GSI for efficient unread queries
      const command = new QueryCommand({
        TableName: TABLES.NOTIFICATIONS,
        IndexName: "UnreadIndex",
        KeyConditionExpression: "userId = :userId AND unread = :unread",
        ExpressionAttributeValues: {
          ":userId": session.user.id,
          ":unread": "true",
        },
        Limit: limit,
        ScanIndexForward: false, // Most recent first (by timestamp in main table)
      });

      const result = await docClient.send(command);
      notifications = (result.Items || []) as Notification[];

      // If type filter is also specified, apply it client-side
      // (Could create a composite GSI for userId#unread#type if this is common)
      if (type) {
        notifications = notifications.filter((n) => n.type === type);
      }
    } else if (type) {
      // Use TypeIndex GSI for type filtering
      const command = new QueryCommand({
        TableName: TABLES.NOTIFICATIONS,
        IndexName: "TypeIndex",
        KeyConditionExpression: "userId = :userId AND #type = :type",
        ExpressionAttributeNames: {
          "#type": "type",
        },
        ExpressionAttributeValues: {
          ":userId": session.user.id,
          ":type": type,
        },
        Limit: limit,
        ScanIndexForward: false,
      });

      const result = await docClient.send(command);
      notifications = (result.Items || []) as Notification[];
    } else {
      // Default query - all notifications for user
      const command = new QueryCommand({
        TableName: TABLES.NOTIFICATIONS,
        KeyConditionExpression: "userId = :userId",
        ExpressionAttributeValues: {
          ":userId": session.user.id,
        },
        Limit: limit,
        ScanIndexForward: false, // Most recent first
      });

      const result = await docClient.send(command);
      notifications = (result.Items || []) as Notification[];
    }

    // Sort by timestamp (descending) - GSI might not preserve order
    notifications.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Calculate unread count from the results or query separately
    const unreadCount = unreadOnly
      ? notifications.length
      : notifications.filter((n) => n.unreadBool === true).length;

    return NextResponse.json({
      notifications: notifications.slice(0, limit),
      unreadCount,
      total: notifications.length,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

/**
 * POST - Create a notification (direct method, prefer using SNS in production)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { targetUserId, type, content, relatedId } = body;

    if (!targetUserId || !type || !content) {
      return NextResponse.json(
        { error: "Missing required fields: targetUserId, type, content" },
        { status: 400 }
      );
    }

    // Validate type
    const validTypes: NotificationType[] = [
      "message",
      "appointment",
      "payment",
      "profile_visit",
      "video_call",
    ];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    const docClient = getDocClient();

    const now = new Date().toISOString();
    const ttl = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // 30 days

    const notification: Notification & { ttl: number } = {
      id: randomUUID(),
      userId: targetUserId,
      senderId: session.user.id,
      type,
      content,
      timestamp: now,
      unread: "true",
      unreadBool: true,
      relatedId,
      ttl,
    };

    await docClient.send(
      new PutCommand({
        TableName: TABLES.NOTIFICATIONS,
        Item: notification,
      })
    );

    return NextResponse.json({ notification }, { status: 201 });
  } catch (error) {
    console.error("Error creating notification:", error);
    return NextResponse.json(
      { error: "Failed to create notification" },
      { status: 500 }
    );
  }
}
