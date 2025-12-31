// src/infrastructure/app.ts

import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { WebSocketStack } from "./websocket-stack";
import { ChimeStack } from "./chime-stack";
import { PaymentSchedulerStack } from "./payment-scheduler-stack";

const app = new cdk.App();

const stage = app.node.tryGetContext("stage") || process.env.STAGE || "prod";

const envConfig = {
  account: process.env.CDK_DEFAULT_ACCOUNT || process.env.AWS_ACCOUNT_ID,
  region:
    process.env.CDK_DEFAULT_REGION || process.env.AWS_REGION || "us-east-2",
};

const tags = {
  Project: "HugHarmony",
  Environment: stage,
  ManagedBy: "CDK",
};

// WebSocket Stack (existing)
new WebSocketStack(app, `ChatWebSocketStack-${stage}`, {
  stage,
  env: envConfig,
  tags,
});

// Chime Stack (existing)
new ChimeStack(app, `ChimeStack-${stage}`, {
  stage,
  env: envConfig,
  tags,
});

// Payment Scheduler Stack (new)
new PaymentSchedulerStack(app, `PaymentSchedulerStack-${stage}`, {
  stage,
  env: envConfig,
  tags,
});
