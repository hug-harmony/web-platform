// src/lambda/ws-disconnect.ts
import { APIGatewayProxyHandler, APIGatewayProxyResult } from "aws-lambda";
import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
  GoneException,
} from "@aws-sdk/client-apigatewaymanagementapi";
import {
  removeConnection,
  getConnectionByConnectionId,
  getConnectionsByUser,
  updateUserLastOnline,
  getAllActiveConnections,
} from "./utils/dynamo";

export const handler: APIGatewayProxyHandler = async (
  event
): Promise<APIGatewayProxyResult> => {
  console.log("Disconnect event:", JSON.stringify(event, null, 2));

  const connectionId = event.requestContext.connectionId;
  const domainName = event.requestContext.domainName;
  const stage = event.requestContext.stage;

  if (!connectionId) {
    console.error("No connectionId found");
    return { statusCode: 400, body: "Missing connectionId" };
  }

  try {
    // Get user ID before removing connection
    const connection = await getConnectionByConnectionId(connectionId);
    const userId = connection?.userId;

    console.log("Removing connection:", connectionId, "for user:", userId);

    // Remove the connection
    await removeConnection(connectionId);
    console.log("Connection removed successfully");

    // Check if user has any other active connections
    if (userId) {
      const remainingConnections = await getConnectionsByUser(userId);

      if (remainingConnections.length === 0) {
        // No more active connections - update lastOnline and broadcast offline status
        await updateUserLastOnline(userId);

        // Broadcast offline status to all connected users
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
      body: `Internal error: ${error instanceof Error ? error.message : "Unknown"}`,
    };
  }
};

async function broadcastOnlineStatus(
  domainName: string,
  stage: string,
  userId: string,
  isOnline: boolean
): Promise<void> {
  const endpoint = `https://${domainName}/${stage}`;
  const apiClient = new ApiGatewayManagementApiClient({ endpoint });

  try {
    // Get all active connections
    const connections = await getAllActiveConnections();

    console.log(
      `Broadcasting offline status for user ${userId} to ${connections.length} connections`
    );

    const message = {
      type: "onlineStatus",
      userId,
      isOnline,
      lastOnline: new Date().toISOString(),
    };

    // Send to all connections (user is already disconnected)
    const results = await Promise.allSettled(
      connections.map(async (conn) => {
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
      `Offline status broadcast complete: ${successful}/${connections.length} successful`
    );
  } catch (error) {
    console.error("Error broadcasting offline status:", error);
  }
}
