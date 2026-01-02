// src/app/api/notifications/mark-all-read/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDocClient, TABLES } from "@/lib/aws/clients";
import { QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

/**
 * POST - Mark all notifications as read
 * Uses UnreadIndex GSI to efficiently find unread notifications
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const docClient = getDocClient();

    // Use UnreadIndex GSI to get only unread notifications
    const queryCommand = new QueryCommand({
      TableName: TABLES.NOTIFICATIONS,
      IndexName: "UnreadIndex",
      KeyConditionExpression: "userId = :userId AND unread = :unread",
      ExpressionAttributeValues: {
        ":userId": session.user.id,
        ":unread": "true",
      },
      // We need userId and timestamp to update the main table
      ProjectionExpression: "userId, #ts",
      ExpressionAttributeNames: {
        "#ts": "timestamp",
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

    // Update each notification in parallel (batch of 25 max for performance)
    const batchSize = 25;
    let totalUpdated = 0;

    for (let i = 0; i < unreadNotifications.length; i += batchSize) {
      const batch = unreadNotifications.slice(i, i + batchSize);

      const updatePromises = batch.map(async (notif) => {
        const updateCommand = new UpdateCommand({
          TableName: TABLES.NOTIFICATIONS,
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
      totalUpdated += batch.length;
    }

    return NextResponse.json({
      message: "All notifications marked as read",
      updated: totalUpdated,
    });
  } catch (error) {
    console.error("Error marking all as read:", error);
    return NextResponse.json(
      { error: "Failed to mark all as read" },
      { status: 500 }
    );
  }
}
