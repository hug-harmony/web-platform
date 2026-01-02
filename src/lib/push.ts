// src/lib/push.ts
import webpush from "web-push";
import { getDocClient, TABLES } from "@/lib/aws/clients";
import { QueryCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";

// Configure web-push with VAPID keys
const configureWebPush = () => {
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
    return true;
  }
  return false;
};

// Initialize on module load
const isConfigured = configureWebPush();

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
  data?: Record<string, unknown>;
}

export interface PushResult {
  success: number;
  failed: number;
}

/**
 * Send push notification to a specific user
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<PushResult> {
  if (!isConfigured) {
    console.log("Web push not configured, skipping");
    return { success: 0, failed: 0 };
  }

  try {
    const docClient = getDocClient();

    // Get all subscriptions for user
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLES.PUSH_SUBSCRIPTIONS,
        KeyConditionExpression: "userId = :userId",
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
                  TableName: TABLES.PUSH_SUBSCRIPTIONS,
                  Key: {
                    userId: userId,
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
  return isConfigured;
}

/**
 * Get push title based on notification type
 */
export function getPushTitle(type: string): string {
  switch (type) {
    case "message":
      return "New Message";
    case "appointment":
      return "Appointment Update";
    case "payment":
      return "Payment Update";
    case "profile_visit":
      return "Profile Visitor";
    case "video_call":
      return "Video Call";
    default:
      return "Hug Harmony";
  }
}

/**
 * Get notification URL based on type
 */
export function getNotificationUrl(type: string, relatedId?: string): string {
  switch (type) {
    case "message":
      return relatedId
        ? `/dashboard/messaging/${relatedId}`
        : "/dashboard/messaging";
    case "appointment":
      return "/dashboard/appointments";
    case "payment":
      return "/dashboard/payment";
    case "profile_visit":
      return relatedId
        ? `/dashboard/profile/${relatedId}`
        : "/dashboard/profile-visits";
    case "video_call":
      return relatedId
        ? `/dashboard/video-session/${relatedId}`
        : "/dashboard/video-session";
    default:
      return "/dashboard/notifications";
  }
}
