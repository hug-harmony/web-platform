// lambda/ws-connect.ts
import { APIGatewayProxyHandler, APIGatewayProxyResult } from "aws-lambda";
import { saveConnection } from "./utils/dynamo";

// Simple JWT decode (for demo - use proper library in production)
function decodeJWT(
  token: string
): { sub: string; [key: string]: unknown } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = Buffer.from(parts[1], "base64url").toString("utf-8");
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

export const handler: APIGatewayProxyHandler = async (
  event
): Promise<APIGatewayProxyResult> => {
  console.log("Connect event:", JSON.stringify(event, null, 2));

  const connectionId = event.requestContext.connectionId;

  if (!connectionId) {
    console.error("Missing connectionId");
    return { statusCode: 400, body: "Missing connectionId" };
  }

  try {
    // Get token from query string
    const token = event.queryStringParameters?.token;

    if (!token) {
      console.error("No token provided");
      return { statusCode: 401, body: "Unauthorized: No token" };
    }

    // Decode and verify token
    const payload = decodeJWT(token);

    if (!payload || !payload.sub) {
      console.error("Invalid token payload");
      return { statusCode: 401, body: "Unauthorized: Invalid token" };
    }

    const userId = payload.sub; // FIXED: Changed from odI to userId
    const conversationIds =
      event.queryStringParameters?.conversations?.split(",").filter(Boolean) ||
      [];

    console.log(`Saving connection: ${connectionId} for user: ${userId}`);

    await saveConnection(connectionId, userId, conversationIds); // FIXED: Use userId

    console.log(`Connection saved successfully`);

    return { statusCode: 200, body: "Connected" };
  } catch (error) {
    console.error("Connect error:", error);
    return { statusCode: 500, body: "Failed to connect" };
  }
};
