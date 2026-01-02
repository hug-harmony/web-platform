// src/infrastructure/app.ts
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { WebSocketStack } from "./websocket-stack";
import { ChimeStack } from "./chime-stack";
import { PaymentSchedulerStack } from "./payment-scheduler-stack";
import { NotificationStack } from "./notification-stack";

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

// ==========================================
// WebSocket Stack (Chat & Real-time)
// ==========================================
const webSocketStack = new WebSocketStack(app, `ChatWebSocketStack-${stage}`, {
  stage,
  env: envConfig,
  tags,
});

// ==========================================
// Notification Stack (SNS/SQS/Lambda)
// Depends on WebSocket Stack for table names and endpoint
// ==========================================
const notificationStack = new NotificationStack(
  app,
  `NotificationStack-${stage}`,
  {
    stage,
    env: envConfig,
    tags,
    description: "Async notification processing infrastructure",
    webSocketApiEndpoint: webSocketStack.webSocketApiEndpoint,
    connectionsTableName: webSocketStack.connectionsTableName,
    notificationsTableName: webSocketStack.notificationsTableName,
    pushSubscriptionsTableName: webSocketStack.pushSubscriptionsTableName,
  }
);

// Add explicit dependency
notificationStack.addDependency(webSocketStack);

// ==========================================
// Chime Stack (Video Calls)
// ==========================================
new ChimeStack(app, `ChimeStack-${stage}`, {
  stage,
  env: envConfig,
  tags,
});

// ==========================================
// Payment Scheduler Stack
// ==========================================
new PaymentSchedulerStack(app, `PaymentSchedulerStack-${stage}`, {
  stage,
  env: envConfig,
  tags,
});

app.synth();
