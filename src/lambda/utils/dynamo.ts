// lambda/utils/dynamo.ts
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  DeleteCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";

const client = new DynamoDBClient({});
export const docClient = DynamoDBDocumentClient.from(client);

export const TABLE_NAME =
  process.env.CONNECTIONS_TABLE || "ChatConnections-prod";
export const NOTIFICATIONS_TABLE =
  process.env.NOTIFICATIONS_TABLE || "Notifications-prod";

// ==========================================
// Connection Types & Functions
// ==========================================

export interface ConnectionRecord {
  connectionId: string;
  userId: string;
  visibleConversationId: string;
  conversationIds: string[];
  connectedAt: number;
  ttl: number;
}

export async function saveConnection(
  connectionId: string,
  userId: string,
  conversationIds: string[]
): Promise<void> {
  const ttl = Math.floor(Date.now() / 1000) + 24 * 60 * 60; // 24 hours
  const visibleConversationId = conversationIds[0] || "none";

  console.log("Saving connection:", {
    connectionId,
    userId,
    visibleConversationId,
    conversationIds,
  });

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        connectionId,
        userId,
        visibleConversationId,
        conversationIds,
        connectedAt: Date.now(),
        ttl,
      } as ConnectionRecord,
    })
  );
}

export async function removeConnection(connectionId: string): Promise<void> {
  console.log("Removing connection:", connectionId);
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
  console.log("Updating visible conversation:", {
    connectionId,
    conversationId,
  });
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
): Promise<Array<{ connectionId: string; userId: string }>> {
  console.log("Getting connections for conversation:", conversationId);

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

  const connections = (result.Items || []).map((item) => ({
    connectionId: item.connectionId as string,
    userId: item.userId as string,
  }));

  console.log(
    `Found ${connections.length} connections for conversation ${conversationId}`
  );
  return connections;
}

export async function getConnectionsByUser(
  userId: string
): Promise<Array<{ connectionId: string; visibleConversationId: string }>> {
  console.log("Getting connections for user:", userId);

  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "UserIndex",
      KeyConditionExpression: "userId = :userId",
      ExpressionAttributeValues: {
        ":userId": userId,
      },
    })
  );

  const connections = (result.Items || []).map((item) => ({
    connectionId: item.connectionId as string,
    visibleConversationId: item.visibleConversationId as string,
  }));

  console.log(`Found ${connections.length} connections for user ${userId}`);
  return connections;
}

// ==========================================
// Notification Types & Functions
// ==========================================

export interface NotificationRecord {
  id: string;
  userId: string;
  senderId?: string;
  type: "message" | "appointment" | "payment" | "profile_visit";
  content: string;
  timestamp: string;
  unread: string;
  unreadBool: boolean;
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
    id: randomUUID(),
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

  console.log("Creating notification:", { userId, type, content });

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
      ScanIndexForward: false,
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
