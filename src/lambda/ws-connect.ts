// src/lambda/ws-connect.ts
import { APIGatewayProxyHandler, APIGatewayProxyResult } from "aws-lambda";
import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
  GoneException,
} from "@aws-sdk/client-apigatewaymanagementapi";
import {
  saveConnection,
  updateUserLastOnline,
  getAllActiveConnections,
  removeConnection,
} from "./utils/dynamo";
import { getNextAuthSecret } from "./utils/secrets";
import * as jwt from "jsonwebtoken";

export const handler: APIGatewayProxyHandler = async (
  event
): Promise<APIGatewayProxyResult> => {
  console.log("Connect event:", JSON.stringify(event, null, 2));

  const connectionId = event.requestContext.connectionId;
  const domainName = event.requestContext.domainName;
  const stage = event.requestContext.stage;

  if (!connectionId) {
    console.error("No connectionId found");
    return { statusCode: 400, body: "Missing connectionId" };
  }

  try {
    // Get token from query string
    const token = event.queryStringParameters?.token;
    const conversationsParam = event.queryStringParameters?.conversations;

    console.log("Token present:", !!token);
    console.log("Conversations param:", conversationsParam);

    if (!token) {
      console.error("No token provided");
      return { statusCode: 401, body: "Unauthorized: No token" };
    }

    // Get secret from Secrets Manager
    const secret = await getNextAuthSecret();
    console.log("Secret fetched successfully");

    // Verify JWT
    let userId: string;
    try {
      const decoded = jwt.verify(token, secret) as { sub: string };
      userId = decoded.sub;
      console.log("JWT verified, userId:", userId);
    } catch (jwtError) {
      console.error("JWT verification failed:", jwtError);
      return { statusCode: 401, body: "Unauthorized: Invalid token" };
    }

    // Parse conversation IDs
    const conversationIds = conversationsParam
      ? conversationsParam.split(",").filter(Boolean)
      : [];

    console.log("Saving connection:", {
      connectionId,
      userId,
      conversationIds,
    });

    // Save connection to DynamoDB
    await saveConnection(connectionId, userId, conversationIds);

    // Update user's lastOnline status
    await updateUserLastOnline(userId);

    // Broadcast online status to all connected users
    if (domainName && stage) {
      await broadcastOnlineStatus(
        domainName,
        stage,
        userId,
        true,
        connectionId
      );
    }

    console.log("Connection saved and user marked online successfully");

    return { statusCode: 200, body: "Connected" };
  } catch (error) {
    console.error("Connect handler error:", error);

    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }

    return {
      statusCode: 500,
      body: `Internal error: ${error instanceof Error ? error.message : "Unknown"}`,
    };
  }
};

async function broadcastOnlineStatus(
  domainName: string,
  stage: string,
  userId: string,
  isOnline: boolean,
  excludeConnectionId?: string
): Promise<void> {
  const endpoint = `https://${domainName}/${stage}`;
  const apiClient = new ApiGatewayManagementApiClient({ endpoint });

  try {
    // Get all active connections
    const connections = await getAllActiveConnections();

    console.log(
      `Broadcasting online status for user ${userId} (isOnline: ${isOnline}) to ${connections.length} connections`
    );

    const message = {
      type: "onlineStatus",
      userId,
      isOnline,
      lastOnline: new Date().toISOString(),
    };

    // Send to all connections except the user's own connection
    const targetConnections = connections.filter(
      (conn) =>
        conn.connectionId !== excludeConnectionId && conn.userId !== userId
    );

    console.log(`Sending to ${targetConnections.length} other connections`);

    const results = await Promise.allSettled(
      targetConnections.map(async (conn) => {
        try {
          await apiClient.send(
            new PostToConnectionCommand({
              ConnectionId: conn.connectionId,
              Data: Buffer.from(JSON.stringify(message)),
            })
          );
          return true;
        } catch (error) {
          if (error instanceof GoneException) {
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
      `Online status broadcast complete: ${successful}/${targetConnections.length} successful`
    );
  } catch (error) {
    console.error("Error broadcasting online status:", error);
  }
}
