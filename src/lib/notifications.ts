// src/lib/notifications.ts
/**
 * Unified notification module
 * - Uses SNS for async processing when available (preferred)
 * - Falls back to direct delivery when SNS is not configured
 */

import {
  getDocClient,
  getApiGatewayManagementClient,
  TABLES,
  isWebSocketConfigured,
  isSNSConfigured,
} from "@/lib/aws/clients";
import { PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { PostToConnectionCommand } from "@aws-sdk/client-apigatewaymanagementapi";
import { randomUUID } from "crypto";
import {
  sendPushToUser,
  isPushConfigured,
  getPushTitle,
  getNotificationUrl,
} from "@/lib/push";
import {
  publishNotification as publishToSNS,
  PublishResult,
} from "@/lib/notifications-sns";

export type NotificationType =
  | "message"
  | "appointment"
  | "payment"
  | "profile_visit"
  | "video_call";

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
 * Create a notification - uses SNS if available, otherwise direct
 * This is the main entry point for creating notifications
 */
export async function createNotification(
  data: NotificationData
): Promise<NotificationRecord | null> {
  // Try SNS first (preferred - async)
  if (isSNSConfigured()) {
    try {
      const result: PublishResult = await publishToSNS({
        targetUserId: data.targetUserId,
        type: data.type,
        content: data.content,
        senderId: data.senderId,
        relatedId: data.relatedId,
      });

      if (result.published) {
        // Return a placeholder record (actual record created by Lambda)
        console.log(
          `Notification published to SNS for user ${data.targetUserId}`
        );
        return {
          id: `sns-${result.messageId || "pending"}`,
          userId: data.targetUserId,
          senderId: data.senderId,
          type: data.type,
          content: data.content,
          timestamp: new Date().toISOString(),
          unread: "true",
          unreadBool: true,
          relatedId: data.relatedId,
          ttl: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        };
      }
      // If not published, fall through to direct method
    } catch (error) {
      console.error("SNS publish failed, falling back to direct:", error);
      // Fall through to direct method
    }
  }

  // Fallback to direct method
  return createNotificationDirect(data);
}

/**
 * Create notification directly (synchronous)
 * Used when SNS is not available or as fallback
 */
export async function createNotificationDirect(
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

  console.log("Creating notification directly:", { targetUserId, type });

  const docClient = getDocClient();

  // Save to DynamoDB
  await docClient.send(
    new PutCommand({
      TableName: TABLES.NOTIFICATIONS,
      Item: notification,
    })
  );

  // Send real-time notification via WebSocket
  await sendRealtimeNotification(targetUserId, notification);

  // Send push notification
  if (isPushConfigured()) {
    sendPushToUser(targetUserId, {
      title: getPushTitle(type),
      body: content,
      tag: type,
      url: getNotificationUrl(type, relatedId),
      data: { type, relatedId, senderId },
    }).catch((err) => {
      console.error("Push notification error:", err);
    });
  }

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
  const docClient = getDocClient();
  const timeAgo = new Date(
    Date.now() - withinMinutes * 60 * 1000
  ).toISOString();

  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLES.NOTIFICATIONS,
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
  if (!isWebSocketConfigured()) {
    console.log("WebSocket not configured, skipping real-time notification");
    return;
  }

  try {
    const docClient = getDocClient();

    // Get user's active WebSocket connections
    const connectionsResult = await docClient.send(
      new QueryCommand({
        TableName: TABLES.CONNECTIONS,
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

    const apiClient = getApiGatewayManagementClient();

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
      `Sent notification to ${successful}/${connections.length} connections`
    );
  } catch (error) {
    console.error("Failed to send real-time notification:", error);
  }
}

// ==========================================
// Helper Functions
// ==========================================

/**
 * Create profile visit notification with rate limiting
 */
export async function createProfileVisitNotification(
  visitorId: string,
  visitorName: string,
  visitedUserId: string
): Promise<NotificationRecord | null> {
  if (visitorId === visitedUserId) {
    return null;
  }

  const hasRecent = await hasRecentNotification(
    visitedUserId,
    "profile_visit",
    visitorId,
    60
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
 * Create message notification
 */
export async function createMessageNotification(
  senderId: string,
  senderName: string,
  recipientId: string,
  conversationId: string,
  messagePreview?: string
): Promise<NotificationRecord | null> {
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
 * Create appointment notification
 */
export async function createAppointmentNotification(
  targetUserId: string,
  content: string,
  appointmentId: string,
  senderId?: string
): Promise<NotificationRecord | null> {
  return createNotification({
    targetUserId,
    type: "appointment",
    content,
    senderId,
    relatedId: appointmentId,
  });
}

/**
 * Create payment notification
 */
export async function createPaymentNotification(
  targetUserId: string,
  content: string,
  paymentId: string,
  senderId?: string
): Promise<NotificationRecord | null> {
  return createNotification({
    targetUserId,
    type: "payment",
    content,
    senderId,
    relatedId: paymentId,
  });
}

/**
 * Create video call notification
 */
export async function createVideoCallNotification(
  targetUserId: string,
  callerName: string,
  sessionId: string,
  senderId: string
): Promise<NotificationRecord | null> {
  return createNotification({
    targetUserId,
    type: "video_call",
    content: `${callerName} is calling you`,
    senderId,
    relatedId: sessionId,
  });
}

/**
 * Create earning confirmed notification
 */
export async function createEarningConfirmedNotification(
  professionalUserId: string,
  amount: number,
  clientName: string,
  earningId: string
): Promise<NotificationRecord | null> {
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);

  return createNotification({
    targetUserId: professionalUserId,
    type: "payment",
    content: `Earning of ${formattedAmount} confirmed for session with ${clientName}`,
    relatedId: earningId,
  });
}

/**
 * Create payout processed notification
 */
export async function createPayoutProcessedNotification(
  professionalUserId: string,
  amount: number,
  payoutId: string
): Promise<NotificationRecord | null> {
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);

  return createNotification({
    targetUserId: professionalUserId,
    type: "payment",
    content: `Your payout of ${formattedAmount} has been processed!`,
    relatedId: payoutId,
  });
}

/**
 * Create confirmation request notification
 */
export async function createConfirmationRequestNotification(
  targetUserId: string,
  otherPartyName: string,
  appointmentId: string,
  isReminder: boolean = false
): Promise<NotificationRecord | null> {
  const content = isReminder
    ? `Reminder: Please confirm your session with ${otherPartyName}`
    : `Please confirm if your session with ${otherPartyName} occurred`;

  return createNotification({
    targetUserId,
    type: "appointment",
    content,
    relatedId: appointmentId,
  });
}

/**
 * Create dispute notification for admin
 */
export async function createDisputeNotificationForAdmin(
  adminUserId: string,
  clientName: string,
  professionalName: string,
  confirmationId: string
): Promise<NotificationRecord | null> {
  return createNotification({
    targetUserId: adminUserId,
    type: "payment",
    content: `Payment dispute between ${clientName} and ${professionalName} requires review`,
    relatedId: confirmationId,
  });
}
