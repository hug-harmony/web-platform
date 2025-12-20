// lambda/utils/dynamo.ts
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  DeleteCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto"; // ✅ Native Node.js - no external package needed

const client = new DynamoDBClient({});
export const docClient = DynamoDBDocumentClient.from(client);

export const TABLE_NAME = process.env.CONNECTIONS_TABLE || "ChatConnections";
export const NOTIFICATIONS_TABLE =
  process.env.NOTIFICATIONS_TABLE || "Notifications-prod";

// ==========================================
// Connection Types & Functions (Existing)
// ==========================================

export interface ConnectionRecord {
  connectionId: string;
  odI: string;
  visibleConversationId: string;
  conversationIds: string[];
  connectedAt: number;
  ttl: number;
}

export async function saveConnection(
  connectionId: string,
  odI: string,
  conversationIds: string[]
): Promise<void> {
  const ttl = Math.floor(Date.now() / 1000) + 24 * 60 * 60; // 24 hours
  const visibleConversationId = conversationIds[0] || "none";

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        connectionId,
        odI,
        visibleConversationId,
        conversationIds,
        connectedAt: Date.now(),
        ttl,
      } as ConnectionRecord,
    })
  );
}

export async function removeConnection(connectionId: string): Promise<void> {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { connectionId },
    })
  );
}

export async function updateVisibleConversation(
  connectionId: string,
  conversationId: string
): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { connectionId },
      UpdateExpression: "SET visibleConversationId = :convId",
      ExpressionAttributeValues: {
        ":convId": conversationId,
      },
    })
  );
}

export async function getConnectionsByConversation(
  conversationId: string
): Promise<Array<{ connectionId: string; odI: string }>> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "ConversationIndex",
      KeyConditionExpression: "visibleConversationId = :convId",
      ExpressionAttributeValues: {
        ":convId": conversationId,
      },
    })
  );

  return (result.Items || []).map((item) => ({
    connectionId: item.connectionId as string,
    odI: item.odI as string,
  }));
}

export async function getConnectionsByUser(
  odI: string
): Promise<Array<{ connectionId: string; visibleConversationId: string }>> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "UserIndex",
      KeyConditionExpression: "odI = :odI",
      ExpressionAttributeValues: {
        ":odI": odI,
      },
    })
  );

  return (result.Items || []).map((item) => ({
    connectionId: item.connectionId as string,
    visibleConversationId: item.visibleConversationId as string,
  }));
}

// ==========================================
// Notification Types & Functions (NEW)
// ==========================================

export interface NotificationRecord {
  id: string;
  userId: string;
  senderId?: string;
  type: "message" | "appointment" | "payment" | "profile_visit";
  content: string;
  timestamp: string;
  unread: string; // "true" or "false" as string for GSI
  unreadBool: boolean; // Actual boolean for logic
  relatedId?: string;
  ttl: number;
}

export async function createNotification(
  userId: string,
  type: NotificationRecord["type"],
  content: string,
  senderId?: string,
  relatedId?: string
): Promise<NotificationRecord> {
  const now = new Date().toISOString();
  const ttl = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // 30 days

  const notification: NotificationRecord = {
    id: randomUUID(), // ✅ Using native crypto
    userId,
    senderId,
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
      TableName: NOTIFICATIONS_TABLE,
      Item: notification,
    })
  );

  return notification;
}

export async function getNotificationsByUser(
  userId: string,
  limit: number = 50
): Promise<NotificationRecord[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: NOTIFICATIONS_TABLE,
      KeyConditionExpression: "userId = :userId",
      ExpressionAttributeValues: {
        ":userId": userId,
      },
      ScanIndexForward: false, // Descending order (newest first)
      Limit: limit,
    })
  );

  return (result.Items || []) as NotificationRecord[];
}

export async function getNotificationById(
  notificationId: string
): Promise<NotificationRecord | null> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: NOTIFICATIONS_TABLE,
      IndexName: "ByIdIndex",
      KeyConditionExpression: "id = :id",
      ExpressionAttributeValues: {
        ":id": notificationId,
      },
    })
  );

  return (result.Items?.[0] as NotificationRecord) || null;
}

export async function markNotificationAsRead(
  userId: string,
  timestamp: string
): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: NOTIFICATIONS_TABLE,
      Key: { userId, timestamp },
      UpdateExpression: "SET unread = :unread, unreadBool = :unreadBool",
      ExpressionAttributeValues: {
        ":unread": "false",
        ":unreadBool": false,
      },
    })
  );
}

export async function markAllNotificationsAsRead(
  userId: string
): Promise<number> {
  // First get all unread notifications
  const result = await docClient.send(
    new QueryCommand({
      TableName: NOTIFICATIONS_TABLE,
      KeyConditionExpression: "userId = :userId",
      FilterExpression: "unreadBool = :unread",
      ExpressionAttributeValues: {
        ":userId": userId,
        ":unread": true,
      },
    })
  );

  const unreadNotifications = result.Items || [];

  if (unreadNotifications.length === 0) {
    return 0;
  }

  // Update each notification
  const updatePromises = unreadNotifications.map((notif) =>
    markNotificationAsRead(notif.userId, notif.timestamp)
  );

  await Promise.all(updatePromises);

  return unreadNotifications.length;
}

export async function deleteNotification(
  userId: string,
  timestamp: string
): Promise<void> {
  await docClient.send(
    new DeleteCommand({
      TableName: NOTIFICATIONS_TABLE,
      Key: { userId, timestamp },
    })
  );
}

export async function getUnreadCount(userId: string): Promise<number> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: NOTIFICATIONS_TABLE,
      KeyConditionExpression: "userId = :userId",
      FilterExpression: "unreadBool = :unread",
      ExpressionAttributeValues: {
        ":userId": userId,
        ":unread": true,
      },
      Select: "COUNT",
    })
  );

  return result.Count || 0;
}
