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

// src/lambda/ws-disconnect.ts
var ws_disconnect_exports = {};
__export(ws_disconnect_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(ws_disconnect_exports);
var import_client_apigatewaymanagementapi = require("@aws-sdk/client-apigatewaymanagementapi");

// src/lambda/utils/dynamo.ts
var import_client_dynamodb = require("@aws-sdk/client-dynamodb");
var import_lib_dynamodb = require("@aws-sdk/lib-dynamodb");
var client = new import_client_dynamodb.DynamoDBClient({});
var docClient = import_lib_dynamodb.DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true }
});
var TABLE_NAME = process.env.CONNECTIONS_TABLE || "ChatConnections-prod";
var NOTIFICATIONS_TABLE = process.env.NOTIFICATIONS_TABLE || "Notifications-prod";
var PUSH_SUBSCRIPTIONS_TABLE = process.env.PUSH_SUBSCRIPTIONS_TABLE || "PushSubscriptions-prod";
var APP_URL = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
var INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;
async function removeConnection(connectionId) {
  console.log("Removing connection:", connectionId);
  await docClient.send(
    new import_lib_dynamodb.DeleteCommand({
      TableName: TABLE_NAME,
      Key: { connectionId }
    })
  );
}
async function getConnectionByConnectionId(connectionId) {
  console.log("Getting connection by connectionId:", connectionId);
  try {
    const result = await docClient.send(
      new import_lib_dynamodb.GetCommand({
        TableName: TABLE_NAME,
        Key: { connectionId }
      })
    );
    return result.Item || null;
  } catch (error) {
    console.error("Error getting connection:", error);
    return null;
  }
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
async function getAllActiveConnections() {
  console.log("Getting all active connections");
  try {
    const result = await docClient.send(
      new import_lib_dynamodb.ScanCommand({
        TableName: TABLE_NAME,
        ProjectionExpression: "connectionId, userId"
      })
    );
    const connections = (result.Items || []).map((item) => ({
      connectionId: item.connectionId,
      userId: item.userId
    }));
    console.log(`Found ${connections.length} total active connections`);
    return connections;
  } catch (error) {
    console.error("Error getting all connections:", error);
    return [];
  }
}
async function updateUserLastOnline(userId) {
  if (!APP_URL) {
    console.warn("APP_URL not configured, skipping lastOnline update");
    return;
  }
  try {
    console.log(`Updating lastOnline for user ${userId}`);
    const response = await fetch(`${APP_URL}/api/users/update-online-status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...INTERNAL_API_KEY && { "x-api-key": INTERNAL_API_KEY }
      },
      body: JSON.stringify({
        userId,
        lastOnline: (/* @__PURE__ */ new Date()).toISOString()
      })
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `Failed to update lastOnline for user ${userId}:`,
        errorText
      );
    } else {
      console.log(`Successfully updated lastOnline for user ${userId}`);
    }
  } catch (error) {
    console.error(`Error updating lastOnline for user ${userId}:`, error);
  }
}

// src/lambda/ws-disconnect.ts
var handler = async (event) => {
  console.log("Disconnect event:", JSON.stringify(event, null, 2));
  const connectionId = event.requestContext.connectionId;
  const domainName = event.requestContext.domainName;
  const stage = event.requestContext.stage;
  if (!connectionId) {
    console.error("No connectionId found");
    return { statusCode: 400, body: "Missing connectionId" };
  }
  try {
    const connection = await getConnectionByConnectionId(connectionId);
    const userId = connection?.userId;
    console.log("Removing connection:", connectionId, "for user:", userId);
    await removeConnection(connectionId);
    console.log("Connection removed successfully");
    if (userId) {
      const remainingConnections = await getConnectionsByUser(userId);
      if (remainingConnections.length === 0) {
        await updateUserLastOnline(userId);
        if (domainName && stage) {
          await broadcastOnlineStatus(domainName, stage, userId, false);
        }
        console.log(
          `User ${userId} has no remaining connections, marked offline and broadcasted`
        );
      } else {
        console.log(
          `User ${userId} still has ${remainingConnections.length} active connection(s)`
        );
      }
    }
    return { statusCode: 200, body: "Disconnected" };
  } catch (error) {
    console.error("Disconnect handler error:", error);
    return {
      statusCode: 500,
      body: `Internal error: ${error instanceof Error ? error.message : "Unknown"}`
    };
  }
};
async function broadcastOnlineStatus(domainName, stage, userId, isOnline) {
  const endpoint = `https://${domainName}/${stage}`;
  const apiClient = new import_client_apigatewaymanagementapi.ApiGatewayManagementApiClient({ endpoint });
  try {
    const connections = await getAllActiveConnections();
    console.log(
      `Broadcasting offline status for user ${userId} to ${connections.length} connections`
    );
    const message = {
      type: "onlineStatus",
      userId,
      isOnline,
      lastOnline: (/* @__PURE__ */ new Date()).toISOString()
    };
    const results = await Promise.allSettled(
      connections.map(async (conn) => {
        try {
          await apiClient.send(
            new import_client_apigatewaymanagementapi.PostToConnectionCommand({
              ConnectionId: conn.connectionId,
              Data: Buffer.from(JSON.stringify(message))
            })
          );
          return true;
        } catch (error) {
          if (error instanceof import_client_apigatewaymanagementapi.GoneException) {
            console.log(`Stale connection, removing: ${conn.connectionId}`);
            await removeConnection(conn.connectionId);
          }
          return false;
        }
      })
    );
    const successful = results.filter(
      (r) => r.status === "fulfilled" && r.value
    ).length;
    console.log(
      `Offline status broadcast complete: ${successful}/${connections.length} successful`
    );
  } catch (error) {
    console.error("Error broadcasting offline status:", error);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
