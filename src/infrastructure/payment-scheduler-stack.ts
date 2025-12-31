// src/infrastructure/payment-scheduler-stack.ts

import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as iam from "aws-cdk-lib/aws-iam";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";
import * as path from "path";

interface PaymentSchedulerStackProps extends cdk.StackProps {
  stage?: string;
}

export class PaymentSchedulerStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    props?: PaymentSchedulerStackProps
  ) {
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
    // Lambda Execution Role
    // ==========================================
    const lambdaRole = new iam.Role(this, "PaymentSchedulerLambdaRole", {
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
    // Payment Processor Lambda Function
    // ==========================================
    const paymentProcessorLambda = new lambda.Function(
      this,
      "PaymentProcessorHandler",
      {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: "payment-processor.handler",
        code: lambda.Code.fromAsset(
          path.join(__dirname, "../../lambda-dist/payments")
        ),
        role: lambdaRole,
        environment: {
          STAGE: stage,
          APP_URL: process.env.NEXT_PUBLIC_APP_URL || "",
          CRON_SECRET: process.env.CRON_SECRET || "",
          SECRETS_NAME: `hug-harmony/${stage}/secrets`,
          NODE_OPTIONS: "--enable-source-maps",
        },
        timeout: cdk.Duration.minutes(5), // Payment processing might take time
        memorySize: 512,
      }
    );

    // ==========================================
    // EventBridge Rule - Weekly Payment Processing
    // Runs every Monday at 3:00 PM UTC
    // ==========================================
    const weeklyPaymentRule = new events.Rule(this, "WeeklyPaymentProcessing", {
      ruleName: `PaymentProcessing-Weekly-${stage}`,
      description: "Triggers payment processing every Monday at 3:00 PM UTC",
      schedule: events.Schedule.cron({
        minute: "0",
        hour: "15",
        weekDay: "MON",
      }),
      enabled: true,
    });

    weeklyPaymentRule.addTarget(
      new targets.LambdaFunction(paymentProcessorLambda, {
        retryAttempts: 2,
      })
    );

    // ==========================================
    // EventBridge Rule - Daily Confirmation Check
    // Runs every day at 9:00 AM UTC
    // ==========================================
    const dailyConfirmationRule = new events.Rule(
      this,
      "DailyConfirmationCheck",
      {
        ruleName: `ConfirmationCheck-Daily-${stage}`,
        description:
          "Checks for appointments needing confirmation daily at 9:00 AM UTC",
        schedule: events.Schedule.cron({
          minute: "0",
          hour: "9",
        }),
        enabled: true,
      }
    );

    dailyConfirmationRule.addTarget(
      new targets.LambdaFunction(paymentProcessorLambda, {
        retryAttempts: 2,
      })
    );

    // ==========================================
    // EventBridge Rule - Auto-confirm after 48 hours
    // Runs every 6 hours
    // ==========================================
    const autoConfirmRule = new events.Rule(this, "AutoConfirmCheck", {
      ruleName: `AutoConfirm-Check-${stage}`,
      description: "Auto-confirms appointments after 48 hours of no response",
      schedule: events.Schedule.rate(cdk.Duration.hours(6)),
      enabled: true,
    });

    autoConfirmRule.addTarget(
      new targets.LambdaFunction(paymentProcessorLambda, {
        retryAttempts: 2,
      })
    );

    // ==========================================
    // Outputs
    // ==========================================
    new cdk.CfnOutput(this, "PaymentProcessorLambdaArn", {
      value: paymentProcessorLambda.functionArn,
      description: "Payment Processor Lambda ARN",
      exportName: `PaymentProcessorLambdaArn-${stage}`,
    });

    new cdk.CfnOutput(this, "WeeklyPaymentRuleArn", {
      value: weeklyPaymentRule.ruleArn,
      description: "Weekly Payment Processing Rule ARN",
      exportName: `WeeklyPaymentRuleArn-${stage}`,
    });
  }
}
