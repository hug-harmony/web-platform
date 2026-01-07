// src/lambda/payments/payment-processor.ts

import { EventBridgeEvent, Context } from "aws-lambda";

interface PaymentProcessingResult {
  success: boolean;
  timestamp: string;
  triggerType: string;
  duration: number;
  results: {
    // Appointment updates
    appointmentsUpdated?: number;
    markedOngoing?: number;
    markedCompleted?: number;
    // Confirmations
    confirmationsCreated: number;
    confirmationErrors: string[];
    autoConfirmed: number;
    // Payments
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
      appointmentsUpdated: 0,
      markedOngoing: 0,
      markedCompleted: 0,
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

    // ==========================================
    // Step 1: Update Appointment Statuses (for appointment-update trigger)
    // This runs every 5 minutes to keep statuses current
    // ==========================================
    if (
      triggerType === "appointment-update" ||
      triggerType === "daily-confirmation"
    ) {
      console.log(`[PAYMENT-PROCESSOR] Updating appointment statuses...`);

      try {
        const appointmentResponse = await fetch(
          `${appUrl}/api/cron/update-appointments`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${cronSecret}`,
            },
          }
        );

        if (appointmentResponse.ok) {
          const appointmentResult = await appointmentResponse.json();
          result.results.appointmentsUpdated =
            appointmentResult.totalUpdated || 0;
          result.results.markedOngoing = appointmentResult.markedOngoing || 0;
          result.results.markedCompleted =
            appointmentResult.markedCompleted || 0;
          result.results.confirmationsCreated +=
            appointmentResult.confirmationsCreated || 0;

          if (appointmentResult.confirmationErrors?.length > 0) {
            result.results.confirmationErrors.push(
              ...appointmentResult.confirmationErrors
            );
          }

          console.log(
            `[PAYMENT-PROCESSOR] Appointment update result:`,
            appointmentResult
          );
        } else {
          const errorText = await appointmentResponse.text();
          console.error(
            `[PAYMENT-PROCESSOR] Appointment update failed: ${errorText}`
          );
          result.results.confirmationErrors.push(
            `Appointment update failed: ${errorText}`
          );
        }
      } catch (error) {
        console.error(`[PAYMENT-PROCESSOR] Appointment update error:`, error);
        result.results.confirmationErrors.push(
          `Appointment update error: ${error instanceof Error ? error.message : "Unknown"}`
        );
      }

      // If this is just an appointment update trigger, we can return early
      if (triggerType === "appointment-update") {
        result.duration = Date.now() - startTime;
        console.log(
          `[PAYMENT-PROCESSOR] Appointment update completed in ${result.duration}ms`
        );
        return result;
      }
    }

    // ==========================================
    // Step 2: Process Payments (for other triggers)
    // ==========================================
    console.log(`[PAYMENT-PROCESSOR] Processing payments...`);

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

    // Merge results (don't overwrite appointment results)
    result.results.confirmationsCreated += apiResult.confirmationsCreated || 0;
    result.results.confirmationErrors.push(
      ...(apiResult.confirmationErrors || [])
    );
    result.results.autoConfirmed = apiResult.autoConfirmed || 0;
    result.results.cyclesProcessed = apiResult.cyclesProcessed || 0;
    result.results.payoutsProcessed = apiResult.payoutsProcessed || 0;
    result.results.payoutsFailed = apiResult.payoutsFailed || 0;
    result.results.payoutErrors = apiResult.payoutErrors || [];
    result.results.emailsSent = apiResult.emailsSent || 0;
    result.results.emailErrors = apiResult.emailErrors || [];

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

  if (ruleName.includes("Appointment")) {
    return "appointment-update";
  } else if (ruleName.includes("Weekly")) {
    return "weekly-payout";
  } else if (ruleName.includes("Daily")) {
    return "daily-confirmation";
  } else if (ruleName.includes("AutoConfirm")) {
    return "auto-confirm";
  }

  return "manual";
}
