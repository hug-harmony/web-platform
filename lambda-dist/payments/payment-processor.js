"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/lambda/payments/payment-processor.ts
var payment_processor_exports = {};
__export(payment_processor_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(payment_processor_exports);
async function handler(event, context) {
  const startTime = Date.now();
  const triggerType = detectTriggerType(event);
  console.log(`[PAYMENT-PROCESSOR] Starting - Trigger: ${triggerType}`);
  console.log(`[PAYMENT-PROCESSOR] Event:`, JSON.stringify(event, null, 2));
  const result = {
    success: true,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
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
      emailErrors: []
    }
  };
  try {
    const appUrl = process.env.APP_URL;
    const cronSecret = process.env.CRON_SECRET;
    if (!appUrl) {
      throw new Error("APP_URL environment variable is not set");
    }
    const response = await fetch(`${appUrl}/api/cron/process-payouts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cronSecret}`,
        "X-Trigger-Type": triggerType
      },
      body: JSON.stringify({
        triggerType,
        requestId: context.awsRequestId
      })
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
      emailErrors: apiResult.emailErrors || []
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
function detectTriggerType(event) {
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
