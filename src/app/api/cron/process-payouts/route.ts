// src/app/api/cron/process-payouts/route.ts

import { NextRequest, NextResponse } from "next/server";
import {
  runScheduledPaymentProcessing,
  checkPaymentSystemHealth,
} from "@/lib/services/payments";

/**
 * Scheduled task for payment processing
 * Triggered by AWS EventBridge, Vercel Cron, or manually
 *
 * This handles:
 * 1. Creating confirmations for completed appointments
 * 2. Auto-resolving expired confirmations at cycle end
 * 3. Creating fee charges for confirmed earnings
 * 4. Processing fee charges (charging cards)
 * 5. Retrying failed charges daily
 */

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  // Health check
  if (action === "health") {
    const health = await checkPaymentSystemHealth();
    return NextResponse.json(health);
  }

  // Run full processing
  return runPaymentProcessing();
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return runPaymentProcessing();
}

async function runPaymentProcessing() {
  const startTime = Date.now();

  try {
    console.log("[CRON:PAYMENTS] Starting scheduled payment processing");

    const result = await runScheduledPaymentProcessing();

    console.log(
      `[CRON:PAYMENTS] Completed in ${result.duration}ms`,
      JSON.stringify(result, null, 2)
    );

    // Don't spread result after setting success - just return the result directly
    // since it already contains a success property
    return NextResponse.json(result);
  } catch (error) {
    console.error("[CRON:PAYMENTS] Fatal error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        duration: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}
