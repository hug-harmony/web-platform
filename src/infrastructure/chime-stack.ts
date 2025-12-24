// src/infrastructure/chime-stack.ts
import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";

interface ChimeStackProps extends cdk.StackProps {
  stage?: string;
}

export class ChimeStack extends cdk.Stack {
  public readonly videoRoomsTableName: string;

  constructor(scope: Construct, id: string, props?: ChimeStackProps) {
    super(scope, id, props);

    const stage = props?.stage || "prod";

    // ==========================================
    // DynamoDB Table for Video Rooms (optional caching)
    // ==========================================
    const videoRoomsTable = new dynamodb.Table(this, "VideoRooms", {
      tableName: `VideoRooms-${stage}`,
      partitionKey: {
        name: "meetingId",
        type: dynamodb.AttributeType.STRING,
      },
      timeToLiveAttribute: "ttl",
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // GSI for querying by appointment
    videoRoomsTable.addGlobalSecondaryIndex({
      indexName: "AppointmentIndex",
      partitionKey: {
        name: "appointmentId",
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI for querying by externalMeetingId
    videoRoomsTable.addGlobalSecondaryIndex({
      indexName: "ExternalMeetingIndex",
      partitionKey: {
        name: "externalMeetingId",
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    this.videoRoomsTableName = videoRoomsTable.tableName;

    // ==========================================
    // Outputs
    // ==========================================
    new cdk.CfnOutput(this, "VideoRoomsTableName", {
      value: this.videoRoomsTableName,
      description: "DynamoDB Video Rooms Table Name",
      exportName: `VideoRoomsTableName-${stage}`,
    });
  }
}
