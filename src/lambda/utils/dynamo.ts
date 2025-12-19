// lambda/utils/dynamo.ts
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  DeleteCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
export const docClient = DynamoDBDocumentClient.from(client);

export const TABLE_NAME = process.env.CONNECTIONS_TABLE || "ChatConnections";

export interface ConnectionRecord {
  connectionId: string;
  odI: string;
  visibleConversationId: string;
  conversationIds: string[];
  connectedAt: number;
  ttl: number;
}

export async function saveConnection(
  connectionId: string,
  odI: string,
  conversationIds: string[]
): Promise<void> {
  const ttl = Math.floor(Date.now() / 1000) + 24 * 60 * 60; // 24 hours
  const visibleConversationId = conversationIds[0] || "none";

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        connectionId,
        odI,
        visibleConversationId,
        conversationIds,
        connectedAt: Date.now(),
        ttl,
      } as ConnectionRecord,
    })
  );
}

export async function removeConnection(connectionId: string): Promise<void> {
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
): Promise<Array<{ connectionId: string; odI: string }>> {
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

  return (result.Items || []).map((item) => ({
    connectionId: item.connectionId as string,
    odI: item.odI as string,
  }));
}

export async function getConnectionsByUser(
  odI: string
): Promise<Array<{ connectionId: string; visibleConversationId: string }>> {
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

  return (result.Items || []).map((item) => ({
    connectionId: item.connectionId as string,
    visibleConversationId: item.visibleConversationId as string,
  }));
}
