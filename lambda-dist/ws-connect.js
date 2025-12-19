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

// src/lambda/ws-connect.ts
var ws_connect_exports = {};
__export(ws_connect_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(ws_connect_exports);

// src/lambda/utils/dynamo.ts
var import_client_dynamodb = require("@aws-sdk/client-dynamodb");
var import_lib_dynamodb = require("@aws-sdk/lib-dynamodb");
var client = new import_client_dynamodb.DynamoDBClient({});
var docClient = import_lib_dynamodb.DynamoDBDocumentClient.from(client);
var TABLE_NAME = process.env.CONNECTIONS_TABLE || "ChatConnections";
async function saveConnection(connectionId, odI, conversationIds) {
  const ttl = Math.floor(Date.now() / 1e3) + 24 * 60 * 60;
  const visibleConversationId = conversationIds[0] || "none";
  await docClient.send(
    new import_lib_dynamodb.PutCommand({
      TableName: TABLE_NAME,
      Item: {
        connectionId,
        odI,
        visibleConversationId,
        conversationIds,
        connectedAt: Date.now(),
        ttl
      }
    })
  );
}

// src/lambda/ws-connect.ts
var JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "";
function decodeJWT(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = Buffer.from(parts[1], "base64url").toString("utf-8");
    return JSON.parse(payload);
  } catch {
    return null;
  }
}
var handler = async (event) => {
  console.log("Connect event:", JSON.stringify(event, null, 2));
  const connectionId = event.requestContext.connectionId;
  if (!connectionId) {
    console.error("Missing connectionId");
    return { statusCode: 400, body: "Missing connectionId" };
  }
  try {
    const token = event.queryStringParameters?.token;
    if (!token) {
      console.error("No token provided");
      return { statusCode: 401, body: "Unauthorized: No token" };
    }
    const payload = decodeJWT(token);
    if (!payload || !payload.sub) {
      console.error("Invalid token payload");
      return { statusCode: 401, body: "Unauthorized: Invalid token" };
    }
    const odI = payload.sub;
    const conversationIds = event.queryStringParameters?.conversations?.split(",").filter(Boolean) || [];
    console.log(`Saving connection: ${connectionId} for user: ${userId}`);
    await saveConnection(connectionId, odI, conversationIds);
    console.log(`Connection saved successfully`);
    return { statusCode: 200, body: "Connected" };
  } catch (error) {
    console.error("Connect error:", error);
    return { statusCode: 500, body: "Failed to connect" };
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
