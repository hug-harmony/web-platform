// src/app/api/notifications/unread-count/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDocClient, TABLES } from "@/lib/aws/clients";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";

/**
 * GET - Get unread notification count
 * Uses UnreadIndex GSI for efficient counting
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const docClient = getDocClient();

    // Use UnreadIndex GSI for efficient count
    // This queries only unread items directly, no filtering needed
    const command = new QueryCommand({
      TableName: TABLES.NOTIFICATIONS,
      IndexName: "UnreadIndex",
      KeyConditionExpression: "userId = :userId AND unread = :unread",
      ExpressionAttributeValues: {
        ":userId": session.user.id,
        ":unread": "true",
      },
      Select: "COUNT",
    });

    const result = await docClient.send(command);

    return NextResponse.json({
      unreadCount: result.Count || 0,
    });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    return NextResponse.json(
      { error: "Failed to fetch unread count" },
      { status: 500 }
    );
  }
}
