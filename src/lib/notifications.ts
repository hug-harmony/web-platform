// src/lib/notifications.ts
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";

const client = new DynamoDBClient({
  region: process.env.REGION || "us-east-2",
  credentials: {
    accessKeyId: process.env.ACCESS_KEY_ID!,
    secretAccessKey: process.env.SECRET_ACCESS_KEY!,
  },
});

const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.NOTIFICATIONS_TABLE || "Notifications-prod";
const CONNECTIONS_TABLE =
  process.env.CONNECTIONS_TABLE || "ChatConnections-prod";

export type NotificationType =
  | "message"
  | "appointment"
  | "payment"
  | "profile_visit";

export interface NotificationData {
  targetUserId: string;
  type: NotificationType;
  content: string;
  senderId?: string;
  relatedId?: string;
}

export interface NotificationRecord {
  id: string;
  userId: string;
  senderId?: string;
  type: NotificationType;
  content: string;
  timestamp: string;
  unread: string;
  unreadBool: boolean;
  relatedId?: string;
  ttl: number;
}

/**
 * Create a notification and optionally send it via WebSocket
 */
export async function createNotification(
  data: NotificationData
): Promise<NotificationRecord> {
  const { targetUserId, type, content, senderId, relatedId } = data;

  const now = new Date().toISOString();
  const ttl = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // 30 days

  const notification: NotificationRecord = {
    id: randomUUID(),
    userId: targetUserId,
    senderId,
    type,
    content,
    timestamp: now,
    unread: "true",
    unreadBool: true,
    relatedId,
    ttl,
  };

  console.log("Creating notification:", { targetUserId, type, content });

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: notification,
    })
  );

  // Send real-time notification via WebSocket
  await sendRealtimeNotification(targetUserId, notification);

  return notification;
}

/**
 * Check if a similar notification was sent recently (for rate limiting)
 */
export async function hasRecentNotification(
  userId: string,
  type: NotificationType,
  relatedId: string,
  withinMinutes: number = 60
): Promise<boolean> {
  const timeAgo = new Date(
    Date.now() - withinMinutes * 60 * 1000
  ).toISOString();

  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "userId = :userId AND #ts >= :timeAgo",
      FilterExpression: "#type = :type AND relatedId = :relatedId",
      ExpressionAttributeNames: {
        "#ts": "timestamp",
        "#type": "type",
      },
      ExpressionAttributeValues: {
        ":userId": userId,
        ":timeAgo": timeAgo,
        ":type": type,
        ":relatedId": relatedId,
      },
      Limit: 1,
    })
  );

  return (result.Items?.length || 0) > 0;
}

/**
 * Send notification to user via WebSocket if they're connected
 */
async function sendRealtimeNotification(
  userId: string,
  notification: NotificationRecord
): Promise<void> {
  try {
    const wsEndpoint = process.env.WEBSOCKET_API_ENDPOINT;
    if (!wsEndpoint) {
      console.log(
        "WebSocket endpoint not configured, skipping real-time notification"
      );
      return;
    }

    // Import dynamically to avoid circular dependencies
    const { ApiGatewayManagementApiClient, PostToConnectionCommand } =
      await import("@aws-sdk/client-apigatewaymanagementapi");

    // Get user's active WebSocket connections
    const connectionsResult = await docClient.send(
      new QueryCommand({
        TableName: CONNECTIONS_TABLE,
        IndexName: "UserIndex",
        KeyConditionExpression: "userId = :userId",
        ExpressionAttributeValues: {
          ":userId": userId,
        },
      })
    );

    const connections = connectionsResult.Items || [];

    if (connections.length === 0) {
      console.log(`No active connections for user ${userId}`);
      return;
    }

    console.log(`Found ${connections.length} connections for user ${userId}`);

    // Send to all active connections
    const apiClient = new ApiGatewayManagementApiClient({
      endpoint: wsEndpoint,
    });

    const results = await Promise.allSettled(
      connections.map(async (conn) => {
        try {
          await apiClient.send(
            new PostToConnectionCommand({
              ConnectionId: conn.connectionId,
              Data: Buffer.from(
                JSON.stringify({
                  type: "notification",
                  notification,
                })
              ),
            })
          );
          return true;
        } catch (error: unknown) {
          // Connection might be stale, ignore GoneException
          if ((error as { name?: string }).name !== "GoneException") {
            console.error(
              `Error sending to connection ${conn.connectionId}:`,
              error
            );
          }
          return false;
        }
      })
    );

    const successful = results.filter(
      (r) => r.status === "fulfilled" && r.value
    ).length;
    console.log(
      `Sent notification to ${successful}/${connections.length} connections for user ${userId}`
    );
  } catch (error) {
    console.error("Failed to send real-time notification:", error);
    // Don't throw - notification was still saved to DynamoDB
  }
}

/**
 * Helper to create profile visit notification with rate limiting
 */
export async function createProfileVisitNotification(
  visitorId: string,
  visitorName: string,
  visitedUserId: string
): Promise<NotificationRecord | null> {
  // Don't notify if user visits their own profile
  if (visitorId === visitedUserId) {
    return null;
  }

  // Rate limit: Check if a notification was already sent in the last hour
  const hasRecent = await hasRecentNotification(
    visitedUserId,
    "profile_visit",
    visitorId,
    60 // 60 minutes
  );

  if (hasRecent) {
    console.log("Profile visit notification rate limited");
    return null;
  }

  return createNotification({
    targetUserId: visitedUserId,
    type: "profile_visit",
    content: `${visitorName} viewed your profile`,
    senderId: visitorId,
    relatedId: visitorId,
  });
}

/**
 * Helper to create message notification
 */
export async function createMessageNotification(
  senderId: string,
  senderName: string,
  recipientId: string,
  conversationId: string,
  messagePreview?: string
): Promise<NotificationRecord> {
  const preview = messagePreview
    ? messagePreview.length > 50
      ? messagePreview.substring(0, 50) + "..."
      : messagePreview
    : "sent you a message";

  return createNotification({
    targetUserId: recipientId,
    type: "message",
    content: `${senderName}: ${preview}`,
    senderId,
    relatedId: conversationId,
  });
}

/**
 * Helper to create appointment notification
 */
export async function createAppointmentNotification(
  targetUserId: string,
  content: string,
  appointmentId: string,
  senderId?: string
): Promise<NotificationRecord> {
  return createNotification({
    targetUserId,
    type: "appointment",
    content,
    senderId,
    relatedId: appointmentId,
  });
}

/**
 * Helper to create payment notification
 */
export async function createPaymentNotification(
  targetUserId: string,
  content: string,
  paymentId: string,
  senderId?: string
): Promise<NotificationRecord> {
  return createNotification({
    targetUserId,
    type: "payment",
    content,
    senderId,
    relatedId: paymentId,
  });
}
