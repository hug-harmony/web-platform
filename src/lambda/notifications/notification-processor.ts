// src/lambda/notifications/notification-processor.ts
import {
  SQSHandler,
  SQSRecord,
  SQSBatchResponse,
  SQSBatchItemFailure,
} from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
  GoneException,
} from "@aws-sdk/client-apigatewaymanagementapi";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import { randomUUID } from "crypto";

// Initialize clients
const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: { removeUndefinedValues: true },
});
const secretsClient = new SecretsManagerClient({});

// Environment variables
const NOTIFICATIONS_TABLE = process.env.NOTIFICATIONS_TABLE!;
const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE!;
const PUSH_SUBSCRIPTIONS_TABLE = process.env.PUSH_SUBSCRIPTIONS_TABLE!;
const WS_ENDPOINT = process.env.WEBSOCKET_API_ENDPOINT!;
const SECRETS_NAME = process.env.SECRETS_NAME!;

// Cache for secrets
let cachedSecrets: Record<string, string> | null = null;

// Types
export type NotificationType =
  | "message"
  | "appointment"
  | "payment"
  | "profile_visit"
  | "video_call";

export interface NotificationPayload {
  targetUserId: string;
  type: NotificationType;
  content: string;
  senderId?: string;
  relatedId?: string;
  skipWebSocket?: boolean;
  skipPush?: boolean;
  metadata?: Record<string, unknown>;
}

export interface NotificationRecord {
  id: string;
  userId: string;
  senderId?: string;
  type: string;
  content: string;
  timestamp: string;
  unread: string;
  unreadBool: boolean;
  relatedId?: string;
  ttl: number;
}

interface PushSubscription {
  userId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface ConnectionRecord {
  connectionId: string;
  userId: string;
  visibleConversationId?: string;
}

/**
 * Main handler - processes SQS messages from SNS
 */
export const handler: SQSHandler = async (event): Promise<SQSBatchResponse> => {
  console.log(`Processing ${event.Records.length} notification(s)`);

  const batchItemFailures: SQSBatchItemFailure[] = [];

  // Process each record
  for (const record of event.Records) {
    try {
      await processRecord(record);
    } catch (error) {
      console.error(`Failed to process record ${record.messageId}:`, error);
      batchItemFailures.push({
        itemIdentifier: record.messageId,
      });
    }
  }

  console.log(
    `Completed: ${event.Records.length - batchItemFailures.length} success, ${batchItemFailures.length} failed`
  );

  return { batchItemFailures };
};

/**
 * Process a single SQS record
 */
async function processRecord(record: SQSRecord): Promise<void> {
  // Parse SNS message from SQS
  const snsMessage = JSON.parse(record.body);
  const payload: NotificationPayload = JSON.parse(snsMessage.Message);

  console.log("Processing notification:", {
    targetUserId: payload.targetUserId,
    type: payload.type,
    messageId: record.messageId,
  });

  // Validate payload
  if (!payload.targetUserId || !payload.type || !payload.content) {
    throw new Error("Invalid notification payload: missing required fields");
  }

  // 1. Save to DynamoDB
  const notification = await saveNotification(payload);

  // 2. Send via WebSocket (if user is connected)
  if (!payload.skipWebSocket) {
    await sendWebSocketNotification(payload.targetUserId, notification);
  }

  // 3. Send Push Notification (if subscribed)
  if (!payload.skipPush) {
    await sendPushNotification(payload.targetUserId, notification);
  }

  console.log(`Successfully processed notification ${notification.id}`);
}

/**
 * Save notification to DynamoDB
 */
async function saveNotification(
  payload: NotificationPayload
): Promise<NotificationRecord> {
  const now = new Date().toISOString();
  const ttl = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // 30 days

  const notification: NotificationRecord = {
    id: randomUUID(),
    userId: payload.targetUserId,
    senderId: payload.senderId,
    type: payload.type,
    content: payload.content,
    timestamp: now,
    unread: "true",
    unreadBool: true,
    relatedId: payload.relatedId,
    ttl,
  };

  await docClient.send(
    new PutCommand({
      TableName: NOTIFICATIONS_TABLE,
      Item: notification,
    })
  );

  console.log(
    `Saved notification ${notification.id} for user ${payload.targetUserId}`
  );
  return notification;
}

/**
 * Send notification via WebSocket
 */
async function sendWebSocketNotification(
  userId: string,
  notification: NotificationRecord
): Promise<void> {
  if (!WS_ENDPOINT) {
    console.log("WebSocket endpoint not configured");
    return;
  }

  try {
    // Get user's active connections
    const result = await docClient.send(
      new QueryCommand({
        TableName: CONNECTIONS_TABLE,
        IndexName: "UserIndex",
        KeyConditionExpression: "userId = :userId",
        ExpressionAttributeValues: {
          ":userId": userId,
        },
      })
    );

    const connections = (result.Items || []) as ConnectionRecord[];
    if (connections.length === 0) {
      console.log(`No active WebSocket connections for user ${userId}`);
      return;
    }

    const apiClient = new ApiGatewayManagementApiClient({
      endpoint: WS_ENDPOINT,
    });

    const payload = JSON.stringify({
      type: "notification",
      notification,
    });

    const sendPromises = connections.map(async (conn) => {
      try {
        await apiClient.send(
          new PostToConnectionCommand({
            ConnectionId: conn.connectionId,
            Data: Buffer.from(payload),
          })
        );
        return { success: true, connectionId: conn.connectionId };
      } catch (error) {
        if (error instanceof GoneException) {
          console.log(`Stale connection: ${conn.connectionId}`);
          // Optionally clean up stale connection here
        } else {
          console.error(
            `Failed to send to connection ${conn.connectionId}:`,
            error
          );
        }
        return { success: false, connectionId: conn.connectionId };
      }
    });

    const results = await Promise.all(sendPromises);
    const successful = results.filter((r) => r.success).length;
    console.log(
      `WebSocket: sent to ${successful}/${connections.length} connections`
    );
  } catch (error) {
    console.error("WebSocket notification error:", error);
    // Don't throw - notification was saved, WebSocket is optional
  }
}

/**
 * Send push notification
 */
async function sendPushNotification(
  userId: string,
  notification: NotificationRecord
): Promise<void> {
  try {
    // Get VAPID keys from secrets
    const secrets = await getSecrets();
    const vapidPublicKey =
      secrets.NEXT_PUBLIC_VAPID_PUBLIC_KEY || secrets.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = secrets.VAPID_PRIVATE_KEY;
    const vapidEmail = secrets.VAPID_EMAIL;

    if (!vapidPublicKey || !vapidPrivateKey || !vapidEmail) {
      console.log("VAPID keys not configured, skipping push notification");
      return;
    }

    // Get user's push subscriptions
    const result = await docClient.send(
      new QueryCommand({
        TableName: PUSH_SUBSCRIPTIONS_TABLE,
        KeyConditionExpression: "userId = :userId",
        ExpressionAttributeValues: {
          ":userId": userId,
        },
      })
    );

    const subscriptions = (result.Items || []) as PushSubscription[];
    if (subscriptions.length === 0) {
      console.log(`No push subscriptions for user ${userId}`);
      return;
    }

    // Dynamically import web-push
    const webpush = await import("web-push");

    webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);

    const pushPayload = JSON.stringify({
      title: getPushTitle(notification.type),
      body: notification.content,
      icon: "/hh-icon.png",
      badge: "/hh-icon.png",
      tag: notification.type,
      url: getNotificationUrl(notification.type, notification.relatedId),
      data: {
        notificationId: notification.id,
        type: notification.type,
        relatedId: notification.relatedId,
      },
    });

    const sendPromises = subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keys,
          },
          pushPayload
        );
        return { success: true };
      } catch (error: unknown) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 410 || statusCode === 404) {
          // Subscription is invalid, remove it
          await docClient.send(
            new DeleteCommand({
              TableName: PUSH_SUBSCRIPTIONS_TABLE,
              Key: {
                userId: userId,
                endpoint: sub.endpoint,
              },
            })
          );
          console.log(`Removed invalid push subscription for user ${userId}`);
        } else {
          console.error(`Push failed for subscription:`, error);
        }
        return { success: false };
      }
    });

    const results = await Promise.all(sendPromises);
    const successful = results.filter((r) => r.success).length;
    console.log(
      `Push: sent to ${successful}/${subscriptions.length} subscriptions`
    );
  } catch (error) {
    console.error("Push notification error:", error);
    // Don't throw - notification was saved, push is optional
  }
}

/**
 * Get secrets from Secrets Manager (cached)
 */
async function getSecrets(): Promise<Record<string, string>> {
  if (cachedSecrets) {
    return cachedSecrets;
  }

  try {
    const response = await secretsClient.send(
      new GetSecretValueCommand({
        SecretId: SECRETS_NAME,
      })
    );

    if (response.SecretString) {
      cachedSecrets = JSON.parse(response.SecretString);
      return cachedSecrets!;
    }
  } catch (error) {
    console.error("Failed to get secrets:", error);
  }

  return {};
}

/**
 * Get push title based on notification type
 */
function getPushTitle(type: string): string {
  switch (type) {
    case "message":
      return "New Message";
    case "appointment":
      return "Appointment Update";
    case "payment":
      return "Payment Update";
    case "profile_visit":
      return "Profile Visitor";
    case "video_call":
      return "Video Call";
    default:
      return "Hug Harmony";
  }
}

/**
 * Get notification URL based on type
 */
function getNotificationUrl(type: string, relatedId?: string): string {
  switch (type) {
    case "message":
      return relatedId
        ? `/dashboard/messaging/${relatedId}`
        : "/dashboard/messaging";
    case "appointment":
      return "/dashboard/appointments";
    case "payment":
      return "/dashboard/payment";
    case "profile_visit":
      return relatedId
        ? `/dashboard/profile/${relatedId}`
        : "/dashboard/profile-visits";
    case "video_call":
      return relatedId
        ? `/dashboard/video-session/${relatedId}`
        : "/dashboard/video-session";
    default:
      return "/dashboard/notifications";
  }
}
