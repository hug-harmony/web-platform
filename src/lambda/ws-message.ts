/* eslint-disable @typescript-eslint/no-explicit-any */
// src/lambda/ws-message.ts
import { APIGatewayProxyHandler, APIGatewayProxyResult } from "aws-lambda";
import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
  GoneException,
} from "@aws-sdk/client-apigatewaymanagementapi";
import {
  getConnectionsByConversation,
  getConnectionsByUser,
  updateVisibleConversation,
  removeConnection,
  createNotification,
  updateUserLastOnline,
  NotificationRecord,
} from "./utils/dynamo";

export const handler: APIGatewayProxyHandler = async (
  event
): Promise<APIGatewayProxyResult> => {
  console.log("Message event:", JSON.stringify(event, null, 2));

  const connectionId = event.requestContext.connectionId;
  const domainName = event.requestContext.domainName;
  const stage = event.requestContext.stage;

  if (!connectionId) {
    return { statusCode: 400, body: "Missing connectionId" };
  }

  const endpoint = `https://${domainName}/${stage}`;
  const apiClient = new ApiGatewayManagementApiClient({ endpoint });

  try {
    const body = JSON.parse(event.body || "{}");
    const { action, conversationId, message, userId } = body;

    console.log(`Processing action: ${action}`, {
      conversationId,
      userId,
      hasMessage: !!message,
    });

    // Update lastOnline on any activity
    if (userId) {
      await updateUserLastOnline(userId);
    }

    switch (action) {
      case "join": {
        if (conversationId) {
          await updateVisibleConversation(connectionId, conversationId);
          console.log(`User joined conversation: ${conversationId}`);

          await sendToConnection(apiClient, connectionId, {
            type: "joined",
            conversationId,
          });
        }
        break;
      }

      case "typing": {
        if (conversationId && userId) {
          console.log(
            `Broadcasting typing from ${userId} to conversation ${conversationId}`
          );
          await broadcastToConversation(
            apiClient,
            conversationId,
            {
              type: "typing",
              userId,
              conversationId,
            },
            connectionId
          );
        } else {
          console.warn("Typing action missing conversationId or userId", {
            conversationId,
            userId,
          });
        }
        break;
      }

      case "sendMessage": {
        if (conversationId && message) {
          console.log(`Broadcasting message to conversation ${conversationId}`);
          await broadcastToConversation(
            apiClient,
            conversationId,
            {
              type: "newMessage",
              message,
              conversationId,
            },
            connectionId
          );
        } else {
          console.warn("sendMessage action missing conversationId or message");
        }
        break;
      }

      // NEW: Edit message action
      case "editMessage": {
        const { messageId, updatedText } = body;

        if (conversationId && messageId && updatedText) {
          console.log(
            `Broadcasting edited message ${messageId} to conversation ${conversationId}`
          );
          await broadcastToConversation(
            apiClient,
            conversationId,
            {
              type: "editMessage",
              messageId,
              updatedText,
              conversationId,
            },
            connectionId
          );

          await sendToConnection(apiClient, connectionId, {
            type: "editMessageAck",
            messageId,
          });
        } else {
          console.warn("editMessage action missing required fields", {
            conversationId,
            messageId,
            updatedText,
          });
        }
        break;
      }

      // NEW: Delete message action
      case "deleteMessage": {
        const { messageId } = body;

        if (conversationId && messageId) {
          console.log(
            `Broadcasting deleted message ${messageId} to conversation ${conversationId}`
          );
          await broadcastToConversation(
            apiClient,
            conversationId,
            {
              type: "deleteMessage",
              messageId,
              conversationId,
            },
            connectionId
          );

          await sendToConnection(apiClient, connectionId, {
            type: "deleteMessageAck",
            messageId,
          });
        } else {
          console.warn("deleteMessage action missing required fields", {
            conversationId,
            messageId,
          });
        }
        break;
      }

      case "notification": {
        const { targetUserId, type, content, senderId, relatedId } = body;

        if (targetUserId && type && content) {
          console.log(`Creating notification for user ${targetUserId}`);
          const notification = await createNotification(
            targetUserId,
            type,
            content,
            senderId,
            relatedId
          );

          await sendNotificationToUser(apiClient, targetUserId, notification);

          await sendToConnection(apiClient, connectionId, {
            type: "notificationSent",
            notification,
          });
        } else {
          console.warn("notification action missing required fields", {
            targetUserId,
            type,
            content,
          });
        }
        break;
      }

      // ============================================
      // Video Call Signaling Actions
      // ============================================
      case "videoInvite": {
        const { targetUserId, sessionId, senderName, appointmentId } = body;

        if (targetUserId && sessionId && userId) {
          console.log(`Video invite from ${userId} to ${targetUserId}`);

          const signal = {
            type: "video_invite",
            sessionId,
            senderId: userId,
            senderName: senderName || "Someone",
            targetUserId,
            appointmentId,
            timestamp: new Date().toISOString(),
          };

          // Send to target user's connections
          await sendVideoSignalToUser(apiClient, targetUserId, signal);

          // Create notification for the invite
          await createNotification(
            targetUserId,
            "video_call" as any,
            `${senderName || "Someone"} is inviting you to a video call`,
            userId,
            sessionId
          );

          // Confirm to sender
          await sendToConnection(apiClient, connectionId, {
            type: "videoInviteSent",
            sessionId,
            targetUserId,
          });
        }
        break;
      }

      case "videoAccept": {
        const { targetUserId, sessionId, senderName } = body;

        if (targetUserId && sessionId && userId) {
          console.log(`Video accept from ${userId} to ${targetUserId}`);

          const signal = {
            type: "video_accept",
            sessionId,
            senderId: userId,
            senderName: senderName || "Someone",
            targetUserId,
            timestamp: new Date().toISOString(),
          };

          await sendVideoSignalToUser(apiClient, targetUserId, signal);
        }
        break;
      }

      case "videoDecline": {
        const { targetUserId, sessionId, senderName } = body;

        if (targetUserId && sessionId && userId) {
          console.log(`Video decline from ${userId} to ${targetUserId}`);

          const signal = {
            type: "video_decline",
            sessionId,
            senderId: userId,
            senderName: senderName || "Someone",
            targetUserId,
            timestamp: new Date().toISOString(),
          };

          await sendVideoSignalToUser(apiClient, targetUserId, signal);
        }
        break;
      }

      case "videoEnd": {
        const { targetUserId, sessionId } = body;

        if (targetUserId && sessionId && userId) {
          console.log(`Video end from ${userId} to ${targetUserId}`);

          const signal = {
            type: "video_end",
            sessionId,
            senderId: userId,
            senderName: "",
            targetUserId,
            timestamp: new Date().toISOString(),
          };

          await sendVideoSignalToUser(apiClient, targetUserId, signal);
        }
        break;
      }

      case "videoJoin": {
        const { targetUserId, sessionId, senderName } = body;

        if (targetUserId && sessionId && userId) {
          console.log(
            `Video join notification from ${userId} to ${targetUserId}`
          );

          const signal = {
            type: "video_join",
            sessionId,
            senderId: userId,
            senderName: senderName || "Someone",
            targetUserId,
            timestamp: new Date().toISOString(),
          };

          await sendVideoSignalToUser(apiClient, targetUserId, signal);
        }
        break;
      }

      case "ping": {
        if (userId) {
          await updateUserLastOnline(userId);
        }
        await sendToConnection(apiClient, connectionId, { type: "pong" });
        break;
      }

      case "heartbeat": {
        if (userId) {
          await updateUserLastOnline(userId);
          await sendToConnection(apiClient, connectionId, {
            type: "heartbeatAck",
            timestamp: new Date().toISOString(),
          });
        }
        break;
      }

      default: {
        console.log(`Unknown action: ${action}`);
        await sendToConnection(apiClient, connectionId, {
          type: "error",
          error: `Unknown action: ${action}`,
        });
      }
    }

    return { statusCode: 200, body: "OK" };
  } catch (error) {
    console.error("Message handler error:", error);
    return { statusCode: 500, body: "Internal error" };
  }
};

async function sendToConnection(
  apiClient: ApiGatewayManagementApiClient,
  connectionId: string,
  data: object
): Promise<boolean> {
  try {
    await apiClient.send(
      new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: Buffer.from(JSON.stringify(data)),
      })
    );
    console.log(`Successfully sent to connection ${connectionId}`);
    return true;
  } catch (error) {
    if (error instanceof GoneException) {
      console.log(`Stale connection, removing: ${connectionId}`);
      await removeConnection(connectionId);
    } else {
      console.error(`Error sending to ${connectionId}:`, error);
    }
    return false;
  }
}

async function broadcastToConversation(
  apiClient: ApiGatewayManagementApiClient,
  conversationId: string,
  data: object,
  excludeConnectionId?: string
): Promise<void> {
  const connections = await getConnectionsByConversation(conversationId);

  console.log(
    `Broadcasting to ${connections.length} connections in conversation ${conversationId}`,
    { excludeConnectionId }
  );

  if (connections.length === 0) {
    console.log(`No connections found for conversation ${conversationId}`);
    return;
  }

  const targetConnections = connections.filter(
    (conn) => conn.connectionId !== excludeConnectionId
  );

  console.log(
    `Sending to ${targetConnections.length} connections (after excluding sender)`
  );

  const results = await Promise.allSettled(
    targetConnections.map((conn) =>
      sendToConnection(apiClient, conn.connectionId, data)
    )
  );

  const successful = results.filter(
    (r) => r.status === "fulfilled" && r.value
  ).length;
  const failed = results.filter(
    (r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value)
  ).length;

  console.log(`Broadcast complete: ${successful} successful, ${failed} failed`);
}

async function sendNotificationToUser(
  apiClient: ApiGatewayManagementApiClient,
  userId: string,
  notification: NotificationRecord
): Promise<void> {
  const connections = await getConnectionsByUser(userId);

  console.log(
    `Sending notification to ${connections.length} connections for user ${userId}`
  );

  if (connections.length === 0) {
    console.log(
      `No active connections for user ${userId}, notification saved to DB only`
    );
    return;
  }

  const results = await Promise.allSettled(
    connections.map((conn) =>
      sendToConnection(apiClient, conn.connectionId, {
        type: "notification",
        notification,
      })
    )
  );

  const successful = results.filter(
    (r) => r.status === "fulfilled" && r.value
  ).length;
  console.log(
    `Notification sent to ${successful}/${connections.length} connections`
  );
}

// Send video signal to user
async function sendVideoSignalToUser(
  apiClient: ApiGatewayManagementApiClient,
  userId: string,
  signal: object
): Promise<void> {
  const connections = await getConnectionsByUser(userId);

  console.log(
    `Sending video signal to ${connections.length} connections for user ${userId}`
  );

  if (connections.length === 0) {
    console.log(`No active connections for user ${userId}`);
    return;
  }

  await Promise.allSettled(
    connections.map((conn) =>
      sendToConnection(apiClient, conn.connectionId, {
        type: "videoCallSignal",
        videoSignal: signal,
      })
    )
  );
}
