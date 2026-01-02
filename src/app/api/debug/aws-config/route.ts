// src/app/api/debug/aws-config/route.ts
import { NextResponse } from "next/server";
import {
  TABLES,
  TOPICS,
  isSNSConfigured,
  isWebSocketConfigured,
  getRegion,
} from "@/lib/aws/clients";

export async function GET() {
  // Only allow in development
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Not available in production" },
      { status: 403 }
    );
  }

  const config = {
    region: getRegion(),
    tables: {
      notifications: TABLES.NOTIFICATIONS,
      pushSubscriptions: TABLES.PUSH_SUBSCRIPTIONS,
      connections: TABLES.CONNECTIONS,
      videoRooms: TABLES.VIDEO_ROOMS,
    },
    topics: {
      notifications: TOPICS.NOTIFICATIONS || "(not set)",
    },
    configured: {
      sns: isSNSConfigured(),
      webSocket: isWebSocketConfigured(),
    },
    envVars: {
      NOTIFICATIONS_TABLE: process.env.NOTIFICATIONS_TABLE || "(not set)",
      NOTIFICATION_TOPIC_ARN: process.env.NOTIFICATION_TOPIC_ARN || "(not set)",
      WEBSOCKET_API_ENDPOINT: process.env.WEBSOCKET_API_ENDPOINT || "(not set)",
      ACCESS_KEY_ID: process.env.ACCESS_KEY_ID
        ? "***" + process.env.ACCESS_KEY_ID.slice(-4)
        : "(not set)",
      REGION: process.env.REGION || process.env.AWS_REGION || "(not set)",
    },
  };

  return NextResponse.json(config, { status: 200 });
}
