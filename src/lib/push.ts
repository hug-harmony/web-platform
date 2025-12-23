// src/lib/push.ts
import webpush from "web-push";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";

// Configure web-push
if (
  process.env.VAPID_EMAIL &&
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
  process.env.VAPID_PRIVATE_KEY
) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

const client = new DynamoDBClient({
  region: process.env.REGION || "us-east-2",
  credentials: {
    accessKeyId: process.env.ACCESS_KEY_ID!,
    secretAccessKey: process.env.SECRET_ACCESS_KEY!,
  },
});

const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME =
  process.env.PUSH_SUBSCRIPTIONS_TABLE || "PushSubscriptions-prod";

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
  data?: Record<string, unknown>;
}

/**
 * Send push notification to a specific user
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<{ success: number; failed: number }> {
  try {
    // Get all subscriptions for user
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "odI = :userId",
        ExpressionAttributeValues: {
          ":userId": userId,
        },
      })
    );

    const subscriptions = result.Items || [];

    if (subscriptions.length === 0) {
      console.log(`No push subscriptions for user ${userId}`);
      return { success: 0, failed: 0 };
    }

    let success = 0;
    let failed = 0;

    const pushPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || "/hh-icon.png",
      badge: payload.badge || "/hh-icon.png",
      tag: payload.tag || "notification",
      url: payload.url || "/dashboard/notifications",
      data: payload.data,
    });

    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: sub.keys,
          };

          await webpush.sendNotification(pushSubscription, pushPayload);
          success++;
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number }).statusCode;

          // If subscription is invalid (410 Gone or 404), remove it
          if (statusCode === 410 || statusCode === 404) {
            console.log(`Removing invalid subscription for user ${userId}`);
            await docClient
              .send(
                new DeleteCommand({
                  TableName: TABLE_NAME,
                  Key: {
                    odI: userId,
                    endpoint: sub.endpoint,
                  },
                })
              )
              .catch(console.error);
          } else {
            console.error(`Push failed for user ${userId}:`, error);
          }
          failed++;
        }
      })
    );

    console.log(`Push to user ${userId}: ${success} success, ${failed} failed`);

    return { success, failed };
  } catch (error) {
    console.error("sendPushToUser error:", error);
    return { success: 0, failed: 0 };
  }
}

/**
 * Check if web-push is configured
 */
export function isPushConfigured(): boolean {
  return !!(
    process.env.VAPID_EMAIL &&
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY
  );
}
