// lambda/ws-disconnect.ts
import { APIGatewayProxyHandler, APIGatewayProxyResult } from "aws-lambda";
import { removeConnection } from "./utils/dynamo";

export const handler: APIGatewayProxyHandler = async (
  event
): Promise<APIGatewayProxyResult> => {
  console.log("Disconnect event:", JSON.stringify(event, null, 2));

  const connectionId = event.requestContext.connectionId;

  if (!connectionId) {
    console.error("No connectionId found");
    return { statusCode: 400, body: "Missing connectionId" };
  }

  try {
    console.log("Removing connection:", connectionId);
    await removeConnection(connectionId);
    console.log("Connection removed successfully");

    return { statusCode: 200, body: "Disconnected" };
  } catch (error) {
    console.error("Disconnect handler error:", error);
    return {
      statusCode: 500,
      body: `Internal error: ${error instanceof Error ? error.message : "Unknown"}`,
    };
  }
};
