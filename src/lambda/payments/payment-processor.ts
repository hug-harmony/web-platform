// src/lambda/payments/payment-processor.ts

import { EventBridgeEvent, Context } from "aws-lambda";

interface PaymentProcessingResult {
  success: boolean;
  timestamp: string;
  triggerType: string;
  duration: number;
  results: {
    confirmationsCreated: number;
    confirmationErrors: string[];
    autoConfirmed: number;
    cyclesProcessed: number;
    payoutsProcessed: number;
    payoutsFailed: number;
    payoutErrors: string[];
    emailsSent: number;
    emailErrors: string[];
  };
}

export async function handler(
  event: EventBridgeEvent<string, unknown>,
  context: Context
): Promise<PaymentProcessingResult> {
  const startTime = Date.now();
  const triggerType = detectTriggerType(event);

  console.log(`[PAYMENT-PROCESSOR] Starting - Trigger: ${triggerType}`);
  console.log(`[PAYMENT-PROCESSOR] Event:`, JSON.stringify(event, null, 2));

  const result: PaymentProcessingResult = {
    success: true,
    timestamp: new Date().toISOString(),
    triggerType,
    duration: 0,
    results: {
      confirmationsCreated: 0,
      confirmationErrors: [],
      autoConfirmed: 0,
      cyclesProcessed: 0,
      payoutsProcessed: 0,
      payoutsFailed: 0,
      payoutErrors: [],
      emailsSent: 0,
      emailErrors: [],
    },
  };

  try {
    const appUrl = process.env.APP_URL;
    const cronSecret = process.env.CRON_SECRET;

    if (!appUrl) {
      throw new Error("APP_URL environment variable is not set");
    }

    // Call the Next.js API endpoint
    const response = await fetch(`${appUrl}/api/cron/process-payouts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cronSecret}`,
        "X-Trigger-Type": triggerType,
      },
      body: JSON.stringify({
        triggerType,
        requestId: context.awsRequestId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API returned ${response.status}: ${errorText}`);
    }

    const apiResult = await response.json();

    result.results = {
      confirmationsCreated: apiResult.confirmationsCreated || 0,
      confirmationErrors: apiResult.confirmationErrors || [],
      autoConfirmed: apiResult.autoConfirmed || 0,
      cyclesProcessed: apiResult.cyclesProcessed || 0,
      payoutsProcessed: apiResult.payoutsProcessed || 0,
      payoutsFailed: apiResult.payoutsFailed || 0,
      payoutErrors: apiResult.payoutErrors || [],
      emailsSent: apiResult.emailsSent || 0,
      emailErrors: apiResult.emailErrors || [],
    };

    result.success = apiResult.success;

    console.log(`[PAYMENT-PROCESSOR] API Response:`, apiResult);
  } catch (error) {
    result.success = false;
    result.results.payoutErrors.push(
      error instanceof Error ? error.message : "Unknown error"
    );
    console.error(`[PAYMENT-PROCESSOR] Error:`, error);
  }

  result.duration = Date.now() - startTime;

  console.log(
    `[PAYMENT-PROCESSOR] Completed in ${result.duration}ms - Success: ${result.success}`
  );

  return result;
}

function detectTriggerType(event: EventBridgeEvent<string, unknown>): string {
  const ruleName = event.resources?.[0] || "";

  if (ruleName.includes("Weekly")) {
    return "weekly-payout";
  } else if (ruleName.includes("Daily")) {
    return "daily-confirmation";
  } else if (ruleName.includes("AutoConfirm")) {
    return "auto-confirm";
  }

  return "manual";
}
