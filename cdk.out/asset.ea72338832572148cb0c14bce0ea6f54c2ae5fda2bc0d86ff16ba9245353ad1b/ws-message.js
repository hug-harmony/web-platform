"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/lambda/ws-message.ts
var ws_message_exports = {};
__export(ws_message_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(ws_message_exports);
var import_client_apigatewaymanagementapi = require("@aws-sdk/client-apigatewaymanagementapi");

// src/lambda/utils/dynamo.ts
var import_client_dynamodb = require("@aws-sdk/client-dynamodb");
var import_lib_dynamodb = require("@aws-sdk/lib-dynamodb");
var import_crypto = require("crypto");
var client = new import_client_dynamodb.DynamoDBClient({});
var docClient = import_lib_dynamodb.DynamoDBDocumentClient.from(client);
var TABLE_NAME = process.env.CONNECTIONS_TABLE || "ChatConnections-prod";
var NOTIFICATIONS_TABLE = process.env.NOTIFICATIONS_TABLE || "Notifications-prod";
async function removeConnection(connectionId) {
  console.log("Removing connection:", connectionId);
  await docClient.send(
    new import_lib_dynamodb.DeleteCommand({
      TableName: TABLE_NAME,
      Key: { connectionId }
    })
  );
}
async function updateVisibleConversation(connectionId, conversationId) {
  console.log("Updating visible conversation:", {
    connectionId,
    conversationId
  });
  await docClient.send(
    new import_lib_dynamodb.UpdateCommand({
      TableName: TABLE_NAME,
      Key: { connectionId },
      UpdateExpression: "SET visibleConversationId = :convId",
      ExpressionAttributeValues: {
        ":convId": conversationId
      }
    })
  );
}
async function getConnectionsByConversation(conversationId) {
  console.log("Getting connections for conversation:", conversationId);
  const result = await docClient.send(
    new import_lib_dynamodb.QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "ConversationIndex",
      KeyConditionExpression: "visibleConversationId = :convId",
      ExpressionAttributeValues: {
        ":convId": conversationId
      }
    })
  );
  const connections = (result.Items || []).map((item) => ({
    connectionId: item.connectionId,
    userId: item.userId
  }));
  console.log(
    `Found ${connections.length} connections for conversation ${conversationId}`
  );
  return connections;
}
async function getConnectionsByUser(userId) {
  console.log("Getting connections for user:", userId);
  const result = await docClient.send(
    new import_lib_dynamodb.QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "UserIndex",
      KeyConditionExpression: "userId = :userId",
      ExpressionAttributeValues: {
        ":userId": userId
      }
    })
  );
  const connections = (result.Items || []).map((item) => ({
    connectionId: item.connectionId,
    visibleConversationId: item.visibleConversationId
  }));
  console.log(`Found ${connections.length} connections for user ${userId}`);
  return connections;
}
async function createNotification(userId, type, content, senderId, relatedId) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const ttl = Math.floor(Date.now() / 1e3) + 30 * 24 * 60 * 60;
  const notification = {
    id: (0, import_crypto.randomUUID)(),
    userId,
    senderId,
    type,
    content,
    timestamp: now,
    unread: "true",
    unreadBool: true,
    relatedId,
    ttl
  };
  console.log("Creating notification:", { userId, type, content });
  await docClient.send(
    new import_lib_dynamodb.PutCommand({
      TableName: NOTIFICATIONS_TABLE,
      Item: notification
    })
  );
  return notification;
}

// src/lambda/ws-message.ts
var handler = async (event) => {
  console.log("Message event:", JSON.stringify(event, null, 2));
  const connectionId = event.requestContext.connectionId;
  const domainName = event.requestContext.domainName;
  const stage = event.requestContext.stage;
  if (!connectionId) {
    return { statusCode: 400, body: "Missing connectionId" };
  }
  const endpoint = `https://${domainName}/${stage}`;
  const apiClient = new import_client_apigatewaymanagementapi.ApiGatewayManagementApiClient({ endpoint });
  try {
    const body = JSON.parse(event.body || "{}");
    const { action, conversationId, message, userId } = body;
    console.log(`Processing action: ${action}`, {
      conversationId,
      userId,
      hasMessage: !!message
    });
    switch (action) {
      case "join": {
        if (conversationId) {
          await updateVisibleConversation(connectionId, conversationId);
          console.log(`User joined conversation: ${conversationId}`);
          await sendToConnection(apiClient, connectionId, {
            type: "joined",
            conversationId
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
              conversationId
            },
            connectionId
          );
        } else {
          console.warn("Typing action missing conversationId or userId", {
            conversationId,
            userId
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
              conversationId
            },
            connectionId
          );
        } else {
          console.warn("sendMessage action missing conversationId or message");
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
            notification
          });
        } else {
          console.warn("notification action missing required fields", {
            targetUserId,
            type,
            content
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
          error: `Unknown action: ${action}`
        });
      }
    }
    return { statusCode: 200, body: "OK" };
  } catch (error) {
    console.error("Message handler error:", error);
    return { statusCode: 500, body: "Internal error" };
  }
};
async function sendToConnection(apiClient, connectionId, data) {
  try {
    await apiClient.send(
      new import_client_apigatewaymanagementapi.PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: Buffer.from(JSON.stringify(data))
      })
    );
    console.log(`Successfully sent to connection ${connectionId}`);
    return true;
  } catch (error) {
    if (error instanceof import_client_apigatewaymanagementapi.GoneException) {
      console.log(`Stale connection, removing: ${connectionId}`);
      await removeConnection(connectionId);
    } else {
      console.error(`Error sending to ${connectionId}:`, error);
    }
    return false;
  }
}
async function broadcastToConversation(apiClient, conversationId, data, excludeConnectionId) {
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
    targetConnections.map(
      (conn) => sendToConnection(apiClient, conn.connectionId, data)
    )
  );
  const successful = results.filter(
    (r) => r.status === "fulfilled" && r.value
  ).length;
  const failed = results.filter(
    (r) => r.status === "rejected" || r.status === "fulfilled" && !r.value
  ).length;
  console.log(`Broadcast complete: ${successful} successful, ${failed} failed`);
}
async function sendNotificationToUser(apiClient, userId, notification) {
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
    connections.map(
      (conn) => sendToConnection(apiClient, conn.connectionId, {
        type: "notification",
        notification
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
