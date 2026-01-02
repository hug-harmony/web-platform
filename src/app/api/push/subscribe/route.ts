// src/app/api/push/subscribe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDocClient, TABLES } from "@/lib/aws/clients";
import { PutCommand, QueryCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";

/**
 * POST - Subscribe to push notifications
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscription = await request.json();

    if (!subscription?.endpoint) {
      return NextResponse.json(
        { error: "Invalid subscription" },
        { status: 400 }
      );
    }

    const docClient = getDocClient();

    // Store subscription in DynamoDB
    const item = {
      userId: session.user.id, // FIXED: was "odI"
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      createdAt: new Date().toISOString(),
      userAgent: request.headers.get("user-agent") || "unknown",
      ttl: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60, // 1 year
    };

    await docClient.send(
      new PutCommand({
        TableName: TABLES.PUSH_SUBSCRIPTIONS,
        Item: item,
      })
    );

    console.log(`Push subscription saved for user ${session.user.id}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Push subscribe error:", error);
    return NextResponse.json(
      { error: "Failed to save subscription" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Unsubscribe from push notifications
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { endpoint } = await request.json();

    if (!endpoint) {
      return NextResponse.json({ error: "Endpoint required" }, { status: 400 });
    }

    const docClient = getDocClient();

    await docClient.send(
      new DeleteCommand({
        TableName: TABLES.PUSH_SUBSCRIPTIONS,
        Key: {
          userId: session.user.id, // FIXED: was "odI"
          endpoint: endpoint,
        },
      })
    );

    console.log(`Push subscription removed for user ${session.user.id}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Push unsubscribe error:", error);
    return NextResponse.json(
      { error: "Failed to remove subscription" },
      { status: 500 }
    );
  }
}

/**
 * GET - Check push subscription status
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const docClient = getDocClient();

    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLES.PUSH_SUBSCRIPTIONS,
        KeyConditionExpression: "userId = :userId", // FIXED: was "odI"
        ExpressionAttributeValues: {
          ":userId": session.user.id,
        },
      })
    );

    return NextResponse.json({
      subscribed: (result.Items?.length || 0) > 0,
      count: result.Items?.length || 0,
    });
  } catch (error) {
    console.error("Get push status error:", error);
    return NextResponse.json(
      { error: "Failed to get status" },
      { status: 500 }
    );
  }
}
