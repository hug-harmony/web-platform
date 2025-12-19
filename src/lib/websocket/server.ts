// lib/websocket/server.ts
import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
  GoneException,
} from "@aws-sdk/client-apigatewaymanagementapi";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";

// Initialize clients
const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || process.env.REGION || "us-east-1",
});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const TABLE_NAME = process.env.CONNECTIONS_TABLE || "ChatConnections-prod";
const WS_ENDPOINT = process.env.WEBSOCKET_API_ENDPOINT;

export interface BroadcastMessage {
  type: "newMessage" | "typing" | "proposalUpdate" | "read" | "online";
  conversationId: string;
  message?: unknown;
  odI?: string;
  proposalId?: string;
}

export interface BroadcastResult {
  success: boolean;
  sentCount: number;
  errors: string[];
}

/**
 * Check if WebSocket broadcasting is available
 */
export function isWebSocketEnabled(): boolean {
  return !!WS_ENDPOINT;
}

/**
 * Broadcast a message to all connected clients in a conversation
 */
export async function broadcastToConversation(
  conversationId: string,
  data: BroadcastMessage,
  excludeUserId?: string
): Promise<BroadcastResult> {
  if (!WS_ENDPOINT) {
    console.log("WebSocket endpoint not configured, skipping broadcast");
    return { success: true, sentCount: 0, errors: [] };
  }

  const apiClient = new ApiGatewayManagementApiClient({
    endpoint: WS_ENDPOINT,
  });

  try {
    // Query all connections for this conversation
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

    const connections = result.Items || [];

    // Filter out excluded user if specified
    const targetConnections = excludeUserId
      ? connections.filter((conn) => conn.odI !== excludeUserId)
      : connections;

    if (targetConnections.length === 0) {
      return { success: true, sentCount: 0, errors: [] };
    }

    const errors: string[] = [];
    let sentCount = 0;

    // Send to all connections
    await Promise.all(
      targetConnections.map(async (conn) => {
        try {
          await apiClient.send(
            new PostToConnectionCommand({
              ConnectionId: conn.connectionId,
              Data: Buffer.from(JSON.stringify(data)),
            })
          );
          sentCount++;
        } catch (error) {
          if (error instanceof GoneException) {
            // Connection is stale, remove it
            console.log(`Removing stale connection: ${conn.connectionId}`);
            await docClient
              .send(
                new DeleteCommand({
                  TableName: TABLE_NAME,
                  Key: { connectionId: conn.connectionId },
                })
              )
              .catch(console.error);
          } else {
            errors.push(`Failed to send to ${conn.connectionId}: ${error}`);
          }
        }
      })
    );

    console.log(
      `Broadcast to conversation ${conversationId}: ${sentCount}/${targetConnections.length} successful`
    );

    return { success: errors.length === 0, sentCount, errors };
  } catch (error) {
    console.error("Broadcast error:", error);
    return { success: false, sentCount: 0, errors: [String(error)] };
  }
}

/**
 * Send a message to a specific user (all their connections)
 */
export async function sendToUser(
  odI: string,
  data: BroadcastMessage
): Promise<BroadcastResult> {
  if (!WS_ENDPOINT) {
    return { success: true, sentCount: 0, errors: [] };
  }

  const apiClient = new ApiGatewayManagementApiClient({
    endpoint: WS_ENDPOINT,
  });

  try {
    // Query all connections for this user
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

    const connections = result.Items || [];
    let sentCount = 0;
    const errors: string[] = [];

    await Promise.all(
      connections.map(async (conn) => {
        try {
          await apiClient.send(
            new PostToConnectionCommand({
              ConnectionId: conn.connectionId,
              Data: Buffer.from(JSON.stringify(data)),
            })
          );
          sentCount++;
        } catch (error) {
          if (error instanceof GoneException) {
            await docClient
              .send(
                new DeleteCommand({
                  TableName: TABLE_NAME,
                  Key: { connectionId: conn.connectionId },
                })
              )
              .catch(console.error);
          } else {
            errors.push(`${conn.connectionId}: ${error}`);
          }
        }
      })
    );

    return { success: errors.length === 0, sentCount, errors };
  } catch (error) {
    console.error("SendToUser error:", error);
    return { success: false, sentCount: 0, errors: [String(error)] };
  }
}
