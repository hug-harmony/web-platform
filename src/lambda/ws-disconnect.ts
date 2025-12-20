// lambda/ws-disconnect.ts
import { APIGatewayProxyHandler, APIGatewayProxyResult } from "aws-lambda";
import { removeConnection } from "./utils/dynamo";

export const handler: APIGatewayProxyHandler = async (
  event
): Promise<APIGatewayProxyResult> => {
  console.log("Disconnect event:", JSON.stringify(event, null, 2));

  const connectionId = event.requestContext.connectionId;

  if (!connectionId) {
    return { statusCode: 400, body: "Missing connectionId" };
  }

  try {
    await removeConnection(connectionId);
    console.log("Connection removed:", connectionId);
    return { statusCode: 200, body: "Disconnected" };
  } catch (error) {
    console.error("Disconnect error:", error);
    return { statusCode: 500, body: "Failed to disconnect" };
  }
};
