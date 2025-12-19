// infrastructure/app.ts

import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { WebSocketStack } from "./websocket-stack";

const app = new cdk.App();

// Get stage from context or environment
const stage = app.node.tryGetContext("stage") || process.env.STAGE || "prod";

new WebSocketStack(app, `ChatWebSocketStack-${stage}`, {
  stage,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT || process.env.AWS_ACCOUNT_ID,
    region:
      process.env.CDK_DEFAULT_REGION || process.env.AWS_REGION || "us-east-1",
  },
  tags: {
    Project: "HugHarmony",
    Environment: stage,
    ManagedBy: "CDK",
  },
});
