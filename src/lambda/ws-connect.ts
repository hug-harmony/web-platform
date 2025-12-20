// lambda/ws-connect.ts
import { APIGatewayProxyHandler, APIGatewayProxyResult } from "aws-lambda";
import { saveConnection } from "./utils/dynamo";
import { getNextAuthSecret } from "./utils/secrets";
import * as jwt from "jsonwebtoken";

export const handler: APIGatewayProxyHandler = async (
  event
): Promise<APIGatewayProxyResult> => {
  console.log("Connect event:", JSON.stringify(event, null, 2));

  const connectionId = event.requestContext.connectionId;

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

    console.log("Connection saved successfully");

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
