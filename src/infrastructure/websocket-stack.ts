// infrastructure/websocket-stack.ts
import * as cdk from "aws-cdk-lib";
import * as apigatewayv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";
import * as path from "path";

interface WebSocketStackProps extends cdk.StackProps {
  stage?: string;
}

export class WebSocketStack extends cdk.Stack {
  public readonly webSocketUrl: string;
  public readonly webSocketApiEndpoint: string;
  public readonly connectionsTableName: string;
  public readonly notificationsTableName: string;

  constructor(scope: Construct, id: string, props?: WebSocketStackProps) {
    super(scope, id, props);

    const stage = props?.stage || "prod";

    // ==========================================
    // Secrets Manager - Fetch secrets
    // ==========================================
    const appSecrets = secretsmanager.Secret.fromSecretNameV2(
      this,
      "AppSecrets",
      `hug-harmony/${stage}/secrets`
    );

    // ==========================================
    // DynamoDB Table for WebSocket Connections
    // ==========================================
    const connectionsTable = new dynamodb.Table(this, "ChatConnections", {
      tableName: `ChatConnections-${stage}`,
      partitionKey: {
        name: "connectionId",
        type: dynamodb.AttributeType.STRING,
      },
      timeToLiveAttribute: "ttl",
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // GSI for querying by conversation
    connectionsTable.addGlobalSecondaryIndex({
      indexName: "ConversationIndex",
      partitionKey: {
        name: "visibleConversationId",
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI for querying by user
    connectionsTable.addGlobalSecondaryIndex({
      indexName: "UserIndex",
      partitionKey: {
        name: "odI",
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // ==========================================
    // DynamoDB Table for Notifications
    // ==========================================
    const notificationsTable = new dynamodb.Table(this, "Notifications", {
      tableName: `Notifications-${stage}`,
      partitionKey: {
        name: "userId",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "timestamp",
        type: dynamodb.AttributeType.STRING,
      },
      timeToLiveAttribute: "ttl",
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // GSI for querying by notification ID
    notificationsTable.addGlobalSecondaryIndex({
      indexName: "ByIdIndex",
      partitionKey: {
        name: "id",
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // ==========================================
    // Lambda Execution Role
    // ==========================================
    const lambdaRole = new iam.Role(this, "WebSocketLambdaRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSLambdaBasicExecutionRole"
        ),
      ],
    });

    // Grant DynamoDB permissions
    connectionsTable.grantReadWriteData(lambdaRole);
    notificationsTable.grantReadWriteData(lambdaRole);

    // Grant Secrets Manager permissions
    appSecrets.grantRead(lambdaRole);

    // ==========================================
    // Lambda Functions
    // ==========================================
    const lambdaEnvironment = {
      CONNECTIONS_TABLE: connectionsTable.tableName,
      NOTIFICATIONS_TABLE: notificationsTable.tableName,
      SECRETS_ARN: appSecrets.secretArn,
      SECRETS_NAME: `hug-harmony/${stage}/secrets`,
      NODE_OPTIONS: "--enable-source-maps",
    };

    const connectHandler = new lambda.Function(this, "ConnectHandler", {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "ws-connect.handler",
      code: lambda.Code.fromAsset(path.join(__dirname, "../../lambda-dist")),
      role: lambdaRole,
      environment: lambdaEnvironment,
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
    });

    const disconnectHandler = new lambda.Function(this, "DisconnectHandler", {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "ws-disconnect.handler",
      code: lambda.Code.fromAsset(path.join(__dirname, "../../lambda-dist")),
      role: lambdaRole,
      environment: lambdaEnvironment,
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
    });

    const messageHandler = new lambda.Function(this, "MessageHandler", {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "ws-message.handler",
      code: lambda.Code.fromAsset(path.join(__dirname, "../../lambda-dist")),
      role: lambdaRole,
      environment: lambdaEnvironment,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
    });

    // ==========================================
    // WebSocket API
    // ==========================================
    const webSocketApi = new apigatewayv2.CfnApi(this, "ChatWebSocketApi", {
      name: `ChatWebSocket-${stage}`,
      protocolType: "WEBSOCKET",
      routeSelectionExpression: "$request.body.action",
    });

    // ==========================================
    // Lambda Integrations
    // ==========================================
    const connectIntegration = new apigatewayv2.CfnIntegration(
      this,
      "ConnectIntegration",
      {
        apiId: webSocketApi.ref,
        integrationType: "AWS_PROXY",
        integrationUri: `arn:aws:apigateway:${this.region}:lambda:path/2015-03-31/functions/${connectHandler.functionArn}/invocations`,
      }
    );

    const disconnectIntegration = new apigatewayv2.CfnIntegration(
      this,
      "DisconnectIntegration",
      {
        apiId: webSocketApi.ref,
        integrationType: "AWS_PROXY",
        integrationUri: `arn:aws:apigateway:${this.region}:lambda:path/2015-03-31/functions/${disconnectHandler.functionArn}/invocations`,
      }
    );

    const messageIntegration = new apigatewayv2.CfnIntegration(
      this,
      "MessageIntegration",
      {
        apiId: webSocketApi.ref,
        integrationType: "AWS_PROXY",
        integrationUri: `arn:aws:apigateway:${this.region}:lambda:path/2015-03-31/functions/${messageHandler.functionArn}/invocations`,
      }
    );

    // ==========================================
    // Routes
    // ==========================================
    new apigatewayv2.CfnRoute(this, "ConnectRoute", {
      apiId: webSocketApi.ref,
      routeKey: "$connect",
      authorizationType: "NONE",
      target: `integrations/${connectIntegration.ref}`,
    });

    new apigatewayv2.CfnRoute(this, "DisconnectRoute", {
      apiId: webSocketApi.ref,
      routeKey: "$disconnect",
      target: `integrations/${disconnectIntegration.ref}`,
    });

    new apigatewayv2.CfnRoute(this, "DefaultRoute", {
      apiId: webSocketApi.ref,
      routeKey: "$default",
      target: `integrations/${messageIntegration.ref}`,
    });

    // Custom routes for specific actions
    const customRoutes = [
      "join",
      "typing",
      "sendMessage",
      "ping",
      "notification",
    ];
    customRoutes.forEach((routeKey) => {
      new apigatewayv2.CfnRoute(this, `${routeKey}Route`, {
        apiId: webSocketApi.ref,
        routeKey,
        target: `integrations/${messageIntegration.ref}`,
      });
    });

    // ==========================================
    // Lambda Permissions
    // ==========================================
    const apiGatewayPrincipal = new iam.ServicePrincipal(
      "apigateway.amazonaws.com"
    );

    connectHandler.grantInvoke(apiGatewayPrincipal);
    disconnectHandler.grantInvoke(apiGatewayPrincipal);
    messageHandler.grantInvoke(apiGatewayPrincipal);

    // Permission to manage WebSocket connections (for broadcasting)
    messageHandler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["execute-api:ManageConnections"],
        resources: [
          `arn:aws:execute-api:${this.region}:${this.account}:${webSocketApi.ref}/*`,
        ],
      })
    );

    // ==========================================
    // Stage
    // ==========================================
    new apigatewayv2.CfnStage(this, "WebSocketStage", {
      apiId: webSocketApi.ref,
      stageName: stage,
      autoDeploy: true,
    });

    // ==========================================
    // Outputs
    // ==========================================
    this.webSocketUrl = `wss://${webSocketApi.ref}.execute-api.${this.region}.amazonaws.com/${stage}`;
    this.webSocketApiEndpoint = `https://${webSocketApi.ref}.execute-api.${this.region}.amazonaws.com/${stage}`;
    this.connectionsTableName = connectionsTable.tableName;
    this.notificationsTableName = notificationsTable.tableName;

    new cdk.CfnOutput(this, "WebSocketURL", {
      value: this.webSocketUrl,
      description: "WebSocket URL for client connections",
      exportName: `ChatWebSocketURL-${stage}`,
    });

    new cdk.CfnOutput(this, "WebSocketApiEndpoint", {
      value: this.webSocketApiEndpoint,
      description: "WebSocket API Endpoint for server-side broadcasts",
      exportName: `ChatWebSocketApiEndpoint-${stage}`,
    });

    new cdk.CfnOutput(this, "ConnectionsTableName", {
      value: this.connectionsTableName,
      description: "DynamoDB Connections Table Name",
      exportName: `ChatConnectionsTableName-${stage}`,
    });

    new cdk.CfnOutput(this, "NotificationsTableName", {
      value: this.notificationsTableName,
      description: "DynamoDB Notifications Table Name",
      exportName: `NotificationsTableName-${stage}`,
    });

    new cdk.CfnOutput(this, "SecretsArn", {
      value: appSecrets.secretArn,
      description: "Secrets Manager ARN",
    });
  }
}
