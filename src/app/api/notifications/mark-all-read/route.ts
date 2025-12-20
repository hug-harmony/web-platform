// src/app/api/notifications/mark-all-read/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({
  region: process.env.REGION || "us-east-2",
  credentials: {
    accessKeyId: process.env.ACCESS_KEY_ID!,
    secretAccessKey: process.env.SECRET_ACCESS_KEY!,
  },
});

const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.NOTIFICATIONS_TABLE || "Notifications-prod";

// POST - Mark all notifications as read
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all unread notifications
    const queryCommand = new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "userId = :userId",
      FilterExpression: "unreadBool = :unread",
      ExpressionAttributeValues: {
        ":userId": session.user.id,
        ":unread": true,
      },
    });

    const result = await docClient.send(queryCommand);
    const unreadNotifications = result.Items || [];

    if (unreadNotifications.length === 0) {
      return NextResponse.json({
        message: "No unread notifications",
        updated: 0,
      });
    }

    // Update each notification
    const updatePromises = unreadNotifications.map(async (notif) => {
      const updateCommand = new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          userId: notif.userId,
          timestamp: notif.timestamp,
        },
        UpdateExpression: "SET unread = :unread, unreadBool = :unreadBool",
        ExpressionAttributeValues: {
          ":unread": "false",
          ":unreadBool": false,
        },
      });
      return docClient.send(updateCommand);
    });

    await Promise.all(updatePromises);

    return NextResponse.json({
      message: "All notifications marked as read",
      updated: unreadNotifications.length,
    });
  } catch (error) {
    console.error("Error marking all as read:", error);
    return NextResponse.json(
      { error: "Failed to mark all as read" },
      { status: 500 }
    );
  }
}
