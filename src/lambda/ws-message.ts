// lambda/ws-message.ts
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
    const { action, conversationId, message, odI } = body;

    console.log(`Processing action: ${action}`);

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
        if (conversationId && odI) {
          await broadcastToConversation(
            apiClient,
            conversationId,
            {
              type: "typing",
              odI,
              conversationId,
            },
            connectionId
          );
        }
        break;
      }

      case "sendMessage": {
        if (conversationId && message) {
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
        }
        break;
      }

      case "notification": {
        const { targetUserId, type, content, senderId, relatedId } = body;

        if (targetUserId && type && content) {
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
        }
        break;
      }

      case "ping": {
        await sendToConnection(apiClient, connectionId, { type: "pong" });
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
    `Broadcasting to ${connections.length} connections in ${conversationId}`
  );

  const sendPromises = connections
    .filter((conn) => conn.connectionId !== excludeConnectionId)
    .map((conn) => sendToConnection(apiClient, conn.connectionId, data));

  await Promise.allSettled(sendPromises);
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

  const sendPromises = connections.map((conn) =>
    sendToConnection(apiClient, conn.connectionId, {
      type: "notification",
      notification,
    })
  );

  await Promise.allSettled(sendPromises);
}
