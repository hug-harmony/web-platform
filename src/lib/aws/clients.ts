// src/lib/aws/clients.ts
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { SNSClient } from "@aws-sdk/client-sns";
import { SQSClient } from "@aws-sdk/client-sqs";
import { ApiGatewayManagementApiClient } from "@aws-sdk/client-apigatewaymanagementapi";

// AWS Configuration
const getAwsConfig = () => {
  const config: {
    region: string;
    credentials?: {
      accessKeyId: string;
      secretAccessKey: string;
    };
  } = {
    region: process.env.AWS_REGION || process.env.REGION || "us-east-2",
  };

  // Only add credentials if explicitly provided (for local dev)
  // In Lambda/Amplify, IAM roles are used automatically
  if (process.env.ACCESS_KEY_ID && process.env.SECRET_ACCESS_KEY) {
    config.credentials = {
      accessKeyId: process.env.ACCESS_KEY_ID,
      secretAccessKey: process.env.SECRET_ACCESS_KEY,
    };
  }

  return config;
};

// Singleton instances for connection reuse
let dynamoClient: DynamoDBClient | null = null;
let docClient: DynamoDBDocumentClient | null = null;
let snsClient: SNSClient | null = null;
let sqsClient: SQSClient | null = null;

/**
 * Get DynamoDB Client (low-level)
 */
export function getDynamoClient(): DynamoDBClient {
  if (!dynamoClient) {
    dynamoClient = new DynamoDBClient(getAwsConfig());
  }
  return dynamoClient;
}

/**
 * Get DynamoDB Document Client (high-level, recommended)
 */
export function getDocClient(): DynamoDBDocumentClient {
  if (!docClient) {
    docClient = DynamoDBDocumentClient.from(getDynamoClient(), {
      marshallOptions: {
        removeUndefinedValues: true,
        convertEmptyValues: false,
      },
      unmarshallOptions: {
        wrapNumbers: false,
      },
    });
  }
  return docClient;
}

/**
 * Get SNS Client
 */
export function getSNSClient(): SNSClient {
  if (!snsClient) {
    snsClient = new SNSClient(getAwsConfig());
  }
  return snsClient;
}

/**
 * Get SQS Client
 */
export function getSQSClient(): SQSClient {
  if (!sqsClient) {
    sqsClient = new SQSClient(getAwsConfig());
  }
  return sqsClient;
}

/**
 * Get API Gateway Management Client for WebSocket
 */
export function getApiGatewayManagementClient(
  endpoint?: string
): ApiGatewayManagementApiClient {
  const wsEndpoint = endpoint || process.env.WEBSOCKET_API_ENDPOINT;

  if (!wsEndpoint) {
    throw new Error("WebSocket API endpoint not configured");
  }

  return new ApiGatewayManagementApiClient({
    ...getAwsConfig(),
    endpoint: wsEndpoint,
  });
}

/**
 * Table names - centralized configuration
 */
export const TABLES = {
  NOTIFICATIONS: process.env.NOTIFICATIONS_TABLE || "Notifications-prod",
  PUSH_SUBSCRIPTIONS:
    process.env.PUSH_SUBSCRIPTIONS_TABLE || "PushSubscriptions-prod",
  CONNECTIONS: process.env.CONNECTIONS_TABLE || "ChatConnections-prod",
  VIDEO_ROOMS: process.env.VIDEO_ROOMS_TABLE || "VideoRooms-prod",
} as const;

/**
 * SNS Topic ARNs
 */
export const TOPICS = {
  NOTIFICATIONS: process.env.NOTIFICATION_TOPIC_ARN || "",
} as const;

/**
 * Check if SNS is configured
 */
export function isSNSConfigured(): boolean {
  const topicArn = process.env.NOTIFICATION_TOPIC_ARN;
  const isConfigured = !!topicArn && topicArn.startsWith("arn:aws:sns:");

  if (!isConfigured) {
    console.log(
      "[AWS] SNS not configured. NOTIFICATION_TOPIC_ARN:",
      topicArn || "(empty)"
    );
  }

  return isConfigured;
}

/**
 * Check if WebSocket is configured
 */
export function isWebSocketConfigured(): boolean {
  return !!process.env.WEBSOCKET_API_ENDPOINT;
}

/**
 * Get the current AWS region
 */
export function getRegion(): string {
  return process.env.AWS_REGION || process.env.REGION || "us-east-2";
}

/**
 * Reset clients (useful for testing)
 */
export function resetClients(): void {
  dynamoClient = null;
  docClient = null;
  snsClient = null;
  sqsClient = null;
}

/**
 * Debug function to log current configuration
 */
export function debugAwsConfig(): void {
  console.log("[AWS Config Debug]");
  console.log("  Region:", getRegion());
  console.log("  Tables:", TABLES);
  console.log("  Topics:", TOPICS);
  console.log("  SNS Configured:", isSNSConfigured());
  console.log("  WebSocket Configured:", isWebSocketConfigured());
  console.log(
    "  Credentials:",
    process.env.ACCESS_KEY_ID ? "Provided" : "Using IAM Role"
  );
}
