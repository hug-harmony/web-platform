// src/infrastructure/notification-stack.ts
import * as cdk from "aws-cdk-lib";
import * as sns from "aws-cdk-lib/aws-sns";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as subscriptions from "aws-cdk-lib/aws-sns-subscriptions";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaEventSources from "aws-cdk-lib/aws-lambda-event-sources";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import { Construct } from "constructs";
import * as path from "path";

interface NotificationStackProps extends cdk.StackProps {
  stage?: string;
  webSocketApiEndpoint: string;
  connectionsTableName: string;
  notificationsTableName: string;
  pushSubscriptionsTableName: string;
}

export class NotificationStack extends cdk.Stack {
  public readonly notificationTopicArn: string;
  public readonly notificationTopicName: string;
  public readonly notificationQueueUrl: string;
  public readonly dlqUrl: string;

  constructor(scope: Construct, id: string, props: NotificationStackProps) {
    super(scope, id, props);

    const stage = props.stage || "prod";

    // ==========================================
    // Secrets Manager - Fetch secrets
    // ==========================================
    const appSecrets = secretsmanager.Secret.fromSecretNameV2(
      this,
      "AppSecrets",
      `hug-harmony/${stage}/secrets`
    );

    // ==========================================
    // SNS Topic for Notifications
    // ==========================================
    const notificationTopic = new sns.Topic(this, "NotificationTopic", {
      topicName: `Notifications-${stage}`,
      displayName: "Hug Harmony Notifications",
    });

    // ==========================================
    // Dead Letter Queue for Failed Messages
    // ==========================================
    const dlq = new sqs.Queue(this, "NotificationDLQ", {
      queueName: `NotificationDLQ-${stage}`,
      retentionPeriod: cdk.Duration.days(14),
      receiveMessageWaitTime: cdk.Duration.seconds(20),
    });

    // ==========================================
    // SQS Queue for Processing
    // ==========================================
    const processingQueue = new sqs.Queue(this, "NotificationQueue", {
      queueName: `NotificationQueue-${stage}`,
      visibilityTimeout: cdk.Duration.seconds(60),
      receiveMessageWaitTime: cdk.Duration.seconds(20),
      deadLetterQueue: {
        queue: dlq,
        maxReceiveCount: 3,
      },
    });

    // Subscribe queue to topic
    notificationTopic.addSubscription(
      new subscriptions.SqsSubscription(processingQueue, {
        rawMessageDelivery: false, // Keep SNS envelope for message attributes
      })
    );

    // ==========================================
    // Lambda Execution Role
    // ==========================================
    const lambdaRole = new iam.Role(this, "NotificationLambdaRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSLambdaBasicExecutionRole"
        ),
      ],
    });

    // Grant Secrets Manager permissions
    appSecrets.grantRead(lambdaRole);

    // ==========================================
    // Import Existing DynamoDB Tables
    // ==========================================
    const notificationsTable = dynamodb.Table.fromTableName(
      this,
      "NotificationsTable",
      props.notificationsTableName
    );

    const connectionsTable = dynamodb.Table.fromTableName(
      this,
      "ConnectionsTable",
      props.connectionsTableName
    );

    const pushSubscriptionsTable = dynamodb.Table.fromTableName(
      this,
      "PushSubscriptionsTable",
      props.pushSubscriptionsTableName
    );

    // Grant DynamoDB permissions
    notificationsTable.grantWriteData(lambdaRole);
    connectionsTable.grantReadData(lambdaRole);
    pushSubscriptionsTable.grantReadWriteData(lambdaRole);

    // Grant WebSocket management permissions
    lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["execute-api:ManageConnections"],
        resources: [
          `arn:aws:execute-api:${this.region}:${this.account}:*/*/@connections/*`,
        ],
      })
    );

    // ==========================================
    // Lambda for Processing Notifications
    // ==========================================
    const processorLambda = new lambda.Function(this, "NotificationProcessor", {
      functionName: `NotificationProcessor-${stage}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "notification-processor.handler",
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../../lambda-dist/notifications")
      ),
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        NOTIFICATIONS_TABLE: props.notificationsTableName,
        CONNECTIONS_TABLE: props.connectionsTableName,
        PUSH_SUBSCRIPTIONS_TABLE: props.pushSubscriptionsTableName,
        WEBSOCKET_API_ENDPOINT: props.webSocketApiEndpoint,
        SECRETS_NAME: `hug-harmony/${stage}/secrets`,
        NODE_OPTIONS: "--enable-source-maps",
      },
      reservedConcurrentExecutions: 10, // Limit concurrent executions
    });

    // Add SQS trigger
    processorLambda.addEventSource(
      new lambdaEventSources.SqsEventSource(processingQueue, {
        batchSize: 10,
        maxBatchingWindow: cdk.Duration.seconds(5),
        reportBatchItemFailures: true, // Enable partial batch failure reporting
      })
    );

    // ==========================================
    // CloudWatch Alarm for DLQ
    // ==========================================
    new cloudwatch.Alarm(this, "DLQAlarm", {
      alarmName: `NotificationDLQ-Messages-${stage}`,
      metric: dlq.metricApproximateNumberOfMessagesVisible(),
      threshold: 1,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: "Alert when there are messages in the notification DLQ",
    });

    // ==========================================
    // CloudWatch Alarm for Processing Errors
    // ==========================================
    new cloudwatch.Alarm(this, "ProcessorErrorAlarm", {
      alarmName: `NotificationProcessor-Errors-${stage}`,
      metric: processorLambda.metricErrors(),
      threshold: 5,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: "Alert when notification processor has errors",
    });

    // ==========================================
    // Store outputs
    // ==========================================
    this.notificationTopicArn = notificationTopic.topicArn;
    this.notificationTopicName = notificationTopic.topicName;
    this.notificationQueueUrl = processingQueue.queueUrl;
    this.dlqUrl = dlq.queueUrl;

    // ==========================================
    // Outputs
    // ==========================================
    new cdk.CfnOutput(this, "NotificationTopicArn", {
      value: notificationTopic.topicArn,
      description: "SNS Topic ARN for publishing notifications",
      exportName: `NotificationTopicArn-${stage}`,
    });

    new cdk.CfnOutput(this, "NotificationTopicName", {
      value: notificationTopic.topicName,
      description: "SNS Topic Name",
      exportName: `NotificationTopicName-${stage}`,
    });

    new cdk.CfnOutput(this, "NotificationQueueUrl", {
      value: processingQueue.queueUrl,
      description: "SQS Queue URL for notification processing",
      exportName: `NotificationQueueUrl-${stage}`,
    });

    new cdk.CfnOutput(this, "NotificationQueueArn", {
      value: processingQueue.queueArn,
      description: "SQS Queue ARN",
      exportName: `NotificationQueueArn-${stage}`,
    });

    new cdk.CfnOutput(this, "NotificationDLQUrl", {
      value: dlq.queueUrl,
      description: "Dead Letter Queue URL",
      exportName: `NotificationDLQUrl-${stage}`,
    });

    new cdk.CfnOutput(this, "NotificationProcessorArn", {
      value: processorLambda.functionArn,
      description: "Notification Processor Lambda ARN",
      exportName: `NotificationProcessorArn-${stage}`,
    });
  }
}
