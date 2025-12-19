// lambda/ws-connect.ts
import { APIGatewayProxyHandler, APIGatewayProxyResult } from "aws-lambda";
import { verify } from "jsonwebtoken"; // Added import for proper verification
import { saveConnection } from "./utils/dynamo";

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

    // Securely verify the JWT using the same secret as NextAuth
    const secret = process.env.NEXTAUTH_SECRET;

    if (!secret) {
      console.error("NEXTAUTH_SECRET environment variable is missing");
      return { statusCode: 500, body: "Server configuration error" };
    }

    let payload: { sub?: string };

    try {
      payload = verify(token, secret) as { sub?: string };
    } catch (err) {
      console.error("Token verification failed:", err);
      return { statusCode: 401, body: "Unauthorized: Invalid token" };
    }

    if (!payload.sub) {
      console.error("Invalid token payload - missing sub");
      return { statusCode: 401, body: "Unauthorized: Missing user ID" };
    }

    const userId = payload.sub;
    const conversationIds =
      event.queryStringParameters?.conversations?.split(",").filter(Boolean) ||
      [];

    console.log(`Saving connection: ${connectionId} for user: ${userId}`);

    await saveConnection(connectionId, userId, conversationIds);

    console.log(`Connection saved successfully`);

    return { statusCode: 200, body: "Connected" };
  } catch (error) {
    console.error("Connect error:", error);
    return { statusCode: 500, body: "Failed to connect" };
  }
};
