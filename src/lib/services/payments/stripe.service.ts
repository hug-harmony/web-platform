// src/lib/services/payments/stripe.service.ts

/**
 * Stripe Integration Service
 *
 * This is a skeleton for future Stripe integration.
 *
 * Prerequisites before enabling:
 * 1. Create Stripe account at https://stripe.com
 * 2. Enable Stripe Connect for marketplace payouts
 * 3. Add environment variables:
 *    - STRIPE_SECRET_KEY
 *    - STRIPE_PUBLISHABLE_KEY
 *    - STRIPE_WEBHOOK_SECRET
 * 4. Set up webhook endpoint at /api/webhooks/stripe
 */

// Uncomment and install: npm install stripe
// import Stripe from 'stripe';

export interface StripeConfig {
  secretKey: string;
  publishableKey: string;
  webhookSecret: string;
}

export interface ConnectedAccount {
  accountId: string;
  professionalId: string;
  status: "pending" | "active" | "restricted" | "disabled";
  payoutsEnabled: boolean;
  chargesEnabled: boolean;
}

export interface PayoutResult {
  success: boolean;
  payoutId?: string;
  transferId?: string;
  error?: string;
}

// ============================================
// STRIPE CLIENT (Uncomment when ready)
// ============================================

// let stripeClient: Stripe | null = null;

// function getStripeClient(): Stripe {
//   if (stripeClient) return stripeClient;

//   if (!process.env.STRIPE_SECRET_KEY) {
//     throw new Error('STRIPE_SECRET_KEY is not configured');
//   }

//   stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
//     apiVersion: '2023-10-16',
//   });

//   return stripeClient;
// }

// ============================================
// CONNECTED ACCOUNTS (Stripe Connect)
// ============================================

/**
 * Create a Stripe Connect account for a professional
 */
export async function createConnectedAccount(
  professionalId: string,
  email: string,
  country: string = "US"
): Promise<ConnectedAccount> {
  // TODO: Implement when Stripe is ready
  console.log("[STRIPE] createConnectedAccount called (not implemented)", {
    professionalId,
    email,
    country,
  });

  throw new Error("Stripe integration not yet implemented");

  // const stripe = getStripeClient();
  //
  // const account = await stripe.accounts.create({
  //   type: 'express',
  //   country,
  //   email,
  //   capabilities: {
  //     transfers: { requested: true },
  //   },
  //   metadata: {
  //     professionalId,
  //   },
  // });
  //
  // return {
  //   accountId: account.id,
  //   professionalId,
  //   status: 'pending',
  //   payoutsEnabled: account.payouts_enabled || false,
  //   chargesEnabled: account.charges_enabled || false,
  // };
}

/**
 * Create an account link for onboarding
 */
export async function createAccountLink(
  accountId: string,
  refreshUrl: string,
  returnUrl: string
): Promise<string> {
  // TODO: Implement when Stripe is ready
  console.log("[STRIPE] createAccountLink called (not implemented)", {
    accountId,
    refreshUrl,
    returnUrl,
  });

  throw new Error("Stripe integration not yet implemented");

  // const stripe = getStripeClient();
  //
  // const accountLink = await stripe.accountLinks.create({
  //   account: accountId,
  //   refresh_url: refreshUrl,
  //   return_url: returnUrl,
  //   type: 'account_onboarding',
  // });
  //
  // return accountLink.url;
}

/**
 * Get account status
 */
export async function getAccountStatus(
  accountId: string
): Promise<ConnectedAccount | null> {
  // TODO: Implement when Stripe is ready
  console.log("[STRIPE] getAccountStatus called (not implemented)", {
    accountId,
  });

  return null;

  // const stripe = getStripeClient();
  //
  // const account = await stripe.accounts.retrieve(accountId);
  //
  // return {
  //   accountId: account.id,
  //   professionalId: account.metadata?.professionalId || '',
  //   status: determineAccountStatus(account),
  //   payoutsEnabled: account.payouts_enabled || false,
  //   chargesEnabled: account.charges_enabled || false,
  // };
}

// ============================================
// PAYOUTS
// ============================================

/**
 * Process a payout to a connected account
 */
export async function processStripePayout(
  connectedAccountId: string,
  amount: number, // in cents
  currency: string = "usd",
  metadata?: Record<string, string>
): Promise<PayoutResult> {
  // TODO: Implement when Stripe is ready
  console.log("[STRIPE] processStripePayout called (not implemented)", {
    connectedAccountId,
    amount,
    currency,
    metadata,
  });

  // For now, return a simulated success
  return {
    success: true,
    payoutId: `sim_payout_${Date.now()}`,
    transferId: `sim_transfer_${Date.now()}`,
  };

  // const stripe = getStripeClient();
  //
  // try {
  //   // First, transfer funds to the connected account
  //   const transfer = await stripe.transfers.create({
  //     amount,
  //     currency,
  //     destination: connectedAccountId,
  //     metadata,
  //   });
  //
  //   return {
  //     success: true,
  //     transferId: transfer.id,
  //   };
  // } catch (error) {
  //   console.error('[STRIPE] Payout failed:', error);
  //   return {
  //     success: false,
  //     error: error instanceof Error ? error.message : 'Unknown error',
  //   };
  // }
}

/**
 * Get payout status
 */
export async function getPayoutStatus(payoutId: string): Promise<string> {
  // TODO: Implement when Stripe is ready
  console.log("[STRIPE] getPayoutStatus called (not implemented)", {
    payoutId,
  });

  return "pending";

  // const stripe = getStripeClient();
  // const payout = await stripe.payouts.retrieve(payoutId);
  // return payout.status;
}

// ============================================
// WEBHOOKS
// ============================================

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): boolean {
  // TODO: Implement when Stripe is ready
  console.log("[STRIPE] verifyWebhookSignature called (not implemented)");
  return false;

  // const stripe = getStripeClient();
  //
  // try {
  //   stripe.webhooks.constructEvent(
  //     payload,
  //     signature,
  //     process.env.STRIPE_WEBHOOK_SECRET!
  //   );
  //   return true;
  // } catch (error) {
  //   console.error('[STRIPE] Webhook signature verification failed:', error);
  //   return false;
  // }
}

/**
 * Handle webhook event
 */
export async function handleWebhookEvent(
  eventType: string,
  data: unknown
): Promise<void> {
  // TODO: Implement when Stripe is ready
  console.log("[STRIPE] handleWebhookEvent called (not implemented)", {
    eventType,
  });

  // switch (eventType) {
  //   case 'account.updated':
  //     // Handle account status changes
  //     break;
  //   case 'payout.paid':
  //     // Handle successful payout
  //     break;
  //   case 'payout.failed':
  //     // Handle failed payout
  //     break;
  //   case 'transfer.created':
  //     // Handle transfer created
  //     break;
  // }
}

// ============================================
// HELPERS
// ============================================

/**
 * Check if Stripe is configured
 */
export function isStripeConfigured(): boolean {
  return !!(
    process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PUBLISHABLE_KEY
  );
}

/**
 * Get Stripe dashboard URL for a connected account
 */
export function getStripeDashboardUrl(accountId: string): string {
  const isLive = process.env.STRIPE_SECRET_KEY?.startsWith("sk_live");
  const baseUrl = isLive
    ? "https://dashboard.stripe.com"
    : "https://dashboard.stripe.com/test";

  return `${baseUrl}/connect/accounts/${accountId}`;
}
