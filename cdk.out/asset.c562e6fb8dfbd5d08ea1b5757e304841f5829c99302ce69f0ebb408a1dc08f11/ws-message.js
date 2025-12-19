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
var client = new import_client_dynamodb.DynamoDBClient({});
var docClient = import_lib_dynamodb.DynamoDBDocumentClient.from(client);
var TABLE_NAME = process.env.CONNECTIONS_TABLE || "ChatConnections";
async function removeConnection(connectionId) {
  await docClient.send(
    new import_lib_dynamodb.DeleteCommand({
      TableName: TABLE_NAME,
      Key: { connectionId }
    })
  );
}
async function updateVisibleConversation(connectionId, conversationId) {
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
  return (result.Items || []).map((item) => ({
    connectionId: item.connectionId,
    odI: item.odI
  }));
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
    const { action, conversationId, message, odI } = body;
    console.log(`Processing action: ${action}`);
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
        if (conversationId && odI) {
          await broadcastToConversation(
            apiClient,
            conversationId,
            {
              type: "typing",
              odI,
              conversationId
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
              conversationId
            },
            connectionId
          );
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
    `Broadcasting to ${connections.length} connections in ${conversationId}`
  );
  const sendPromises = connections.filter((conn) => conn.connectionId !== excludeConnectionId).map((conn) => sendToConnection(apiClient, conn.connectionId, data));
  await Promise.allSettled(sendPromises);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
