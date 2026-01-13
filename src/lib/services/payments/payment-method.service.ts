
// src/lib/services/payments/payment-method.service.ts

import prisma from "@/lib/prisma";
import {
  ProfessionalPaymentMethod,
  SetupPaymentMethodResponse,
} from "@/types/payments";
import { buildDisplayName } from "@/lib/utils";
import {
  sendPaymentMethodAddedEmail,
  sendCardExpiringSoonEmail,
  sendAccountUnblockedEmail,
} from "@/lib/services/email";

// ============================================
// STRIPE SETUP (placeholder for actual integration)
// ============================================

/**
 * Create or get Stripe customer for a professional
 */
async function getOrCreateStripeCustomer(
  professionalId: string,
  // email: string,
  // name: string
): Promise<string> {
  const professional = await prisma.professional.findUnique({
    where: { id: professionalId },
    select: { stripeCustomerId: true },
  });

  if (professional?.stripeCustomerId) {
    return professional.stripeCustomerId;
  }

  // TODO: Create actual Stripe customer
  // const stripe = getStripeClient();
  // const customer = await stripe.customers.create({
  //   email,
  //   name,
  //   metadata: { professionalId },
  // });
  // return customer.id;

  // Simulated customer ID for now
  const customerId = `cus_simulated_${professionalId}_${Date.now()}`;

  await prisma.professional.update({
    where: { id: professionalId },
    data: { stripeCustomerId: customerId },
  });

  return customerId;
}

// ============================================
// PAYMENT METHOD SETUP
// ============================================

/**
 * Create a setup intent for adding a payment method
 */
export async function createPaymentMethodSetup(
  professionalId: string
): Promise<SetupPaymentMethodResponse> {
  const professional = await prisma.professional.findUnique({
    where: { id: professionalId },
    include: {
      applications: {
        where: { status: "APPROVED" },
        include: {
          user: {
            select: {
              email: true,
              name: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
    },
  });

  if (!professional) {
    throw new Error("Professional not found");
  }

  const application = professional.applications[0];
  if (!application) {
    throw new Error("No approved application found");
  }

  // const email = application.user.email;
  // const name =
  //   application.user.name ||
  //   `${application.user.firstName || ""} ${application.user.lastName || ""}`.trim() ||
  //   "Professional";

  // Get or create Stripe customer
  await getOrCreateStripeCustomer(
    professionalId,
    // email,
    // name
  );

  // TODO: Create actual Stripe SetupIntent
  // const stripe = getStripeClient();
  // const setupIntent = await stripe.setupIntents.create({
  //   customer: customerId,
  //   payment_method_types: ['card'],
  //   metadata: { professionalId },
  // });
  // return {
  //   clientSecret: setupIntent.client_secret!,
  //   setupIntentId: setupIntent.id,
  // };

  // Simulated setup intent for now
  const setupIntentId = `seti_simulated_${Date.now()}`;
  const clientSecret = `${setupIntentId}_secret_simulated`;

  return {
    clientSecret,
    setupIntentId,
  };
}

/**
 * Confirm payment method was added (called after Stripe confirmation)
 */
export async function confirmPaymentMethodAdded(
  professionalId: string,
  paymentMethodId: string,
  cardDetails: {
    last4: string;
    brand: string;
    expiryMonth: number;
    expiryYear: number;
  }
): Promise<ProfessionalPaymentMethod> {
  const professional = await prisma.professional.findUnique({
    where: { id: professionalId },
    include: {
      applications: {
        where: { status: "APPROVED" },
        include: {
          user: {
            select: {
              email: true,
              name: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
    },
  });

  if (!professional) {
    throw new Error("Professional not found");
  }

  const wasBlocked = !!professional.paymentBlockedAt;

  const updatedProfessional = await prisma.professional.update({
    where: { id: professionalId },
    data: {
      stripePaymentMethodId: paymentMethodId,
      cardLast4: cardDetails.last4,
      cardBrand: cardDetails.brand,
      cardExpiryMonth: cardDetails.expiryMonth,
      cardExpiryYear: cardDetails.expiryYear,
      hasValidPaymentMethod: true,
      paymentMethodAddedAt: new Date(),
      // Clear any payment blocks when new payment method is added
      paymentBlockedAt: null,
      paymentBlockReason: null,
    },
  });

  const professionalUser = professional.applications[0]?.user;
  const professionalEmail = professionalUser?.email;
  const professionalName = professionalUser
    ? buildDisplayName(professionalUser)
    : professional.name;

  // Send confirmation email
  if (professionalEmail) {
    try {
      await sendPaymentMethodAddedEmail(
        professionalEmail,
        professionalName,
        cardDetails.brand,
        cardDetails.last4
      );
    } catch (emailError) {
      console.error("Failed to send payment method added email:", emailError);
    }

    // If they were blocked, send unblocked email
    if (wasBlocked) {
      try {
        await sendAccountUnblockedEmail(professionalEmail, professionalName);
      } catch (emailError) {
        console.error("Failed to send account unblocked email:", emailError);
      }
    }
  }

  return {
    hasPaymentMethod: true,
    cardLast4: updatedProfessional.cardLast4,
    cardBrand: updatedProfessional.cardBrand,
    cardExpiryMonth: updatedProfessional.cardExpiryMonth,
    cardExpiryYear: updatedProfessional.cardExpiryYear,
    addedAt: updatedProfessional.paymentMethodAddedAt,
    isBlocked: false,
    blockedReason: null,
  };
}

/**
 * Remove payment method
 */
export async function removePaymentMethod(
  professionalId: string
): Promise<void> {
  // TODO: Detach payment method from Stripe
  // const stripe = getStripeClient();
  // const professional = await prisma.professional.findUnique({
  //   where: { id: professionalId },
  //   select: { stripePaymentMethodId: true },
  // });
  // if (professional?.stripePaymentMethodId) {
  //   await stripe.paymentMethods.detach(professional.stripePaymentMethodId);
  // }

  await prisma.professional.update({
    where: { id: professionalId },
    data: {
      stripePaymentMethodId: null,
      cardLast4: null,
      cardBrand: null,
      cardExpiryMonth: null,
      cardExpiryYear: null,
      hasValidPaymentMethod: false,
      paymentMethodAddedAt: null,
    },
  });
}

// ============================================
// PAYMENT METHOD RETRIEVAL
// ============================================

/**
 * Get payment method status for a professional
 */
export async function getPaymentMethodStatus(
  professionalId: string
): Promise<ProfessionalPaymentMethod> {
  const professional = await prisma.professional.findUnique({
    where: { id: professionalId },
    select: {
      stripePaymentMethodId: true,
      cardLast4: true,
      cardBrand: true,
      cardExpiryMonth: true,
      cardExpiryYear: true,
      hasValidPaymentMethod: true,
      paymentMethodAddedAt: true,
      paymentBlockedAt: true,
      paymentBlockReason: true,
    },
  });

  if (!professional) {
    throw new Error("Professional not found");
  }

  return {
    hasPaymentMethod: professional.hasValidPaymentMethod,
    cardLast4: professional.cardLast4,
    cardBrand: professional.cardBrand,
    cardExpiryMonth: professional.cardExpiryMonth,
    cardExpiryYear: professional.cardExpiryYear,
    addedAt: professional.paymentMethodAddedAt,
    isBlocked: !!professional.paymentBlockedAt,
    blockedReason: professional.paymentBlockReason,
  };
}

/**
 * Check if professional has valid payment method
 */
export async function hasValidPaymentMethod(
  professionalId: string
): Promise<boolean> {
  const professional = await prisma.professional.findUnique({
    where: { id: professionalId },
    select: { hasValidPaymentMethod: true },
  });

  return professional?.hasValidPaymentMethod || false;
}

/**
 * Check if professional is blocked from payments
 */
export async function isPaymentBlocked(professionalId: string): Promise<{
  blocked: boolean;
  reason: string | null;
  blockedAt: Date | null;
}> {
  const professional = await prisma.professional.findUnique({
    where: { id: professionalId },
    select: {
      paymentBlockedAt: true,
      paymentBlockReason: true,
    },
  });

  return {
    blocked: !!professional?.paymentBlockedAt,
    reason: professional?.paymentBlockReason || null,
    blockedAt: professional?.paymentBlockedAt || null,
  };
}

/**
 * Check card expiry and invalidate if expired
 * Also sends warning emails for cards expiring soon
 */
export async function checkAndInvalidateExpiredCards(): Promise<{
  invalidated: number;
  warned: number;
}> {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Calculate next month for warning
  let nextMonth = currentMonth + 1;
  let nextMonthYear = currentYear;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextMonthYear++;
  }

  // Find professionals with expired cards
  const expiredCards = await prisma.professional.findMany({
    where: {
      hasValidPaymentMethod: true,
      OR: [
        { cardExpiryYear: { lt: currentYear } },
        {
          AND: [
            { cardExpiryYear: currentYear },
            { cardExpiryMonth: { lt: currentMonth } },
          ],
        },
      ],
    },
    select: { id: true },
  });

  // Invalidate expired cards
  if (expiredCards.length > 0) {
    await prisma.professional.updateMany({
      where: {
        id: { in: expiredCards.map((p) => p.id) },
      },
      data: {
        hasValidPaymentMethod: false,
        paymentBlockedAt: new Date(),
        paymentBlockReason: "Card has expired",
      },
    });
  }

  // Find professionals with cards expiring next month (for warning)
  const expiringCards = await prisma.professional.findMany({
    where: {
      hasValidPaymentMethod: true,
      cardExpiryYear: nextMonthYear,
      cardExpiryMonth: nextMonth,
    },
    include: {
      applications: {
        where: { status: "APPROVED" },
        include: {
          user: {
            select: {
              email: true,
              name: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
    },
  });

  let warned = 0;

  // Send warning emails
  for (const professional of expiringCards) {
    const professionalUser = professional.applications[0]?.user;
    const professionalEmail = professionalUser?.email;
    const professionalName = professionalUser
      ? buildDisplayName(professionalUser)
      : professional.name;

    if (professionalEmail && professional.cardBrand && professional.cardLast4) {
      try {
        await sendCardExpiringSoonEmail(
          professionalEmail,
          professionalName,
          professional.cardBrand,
          professional.cardLast4,
          professional.cardExpiryMonth!,
          professional.cardExpiryYear!
        );
        warned++;
      } catch (emailError) {
        console.error("Failed to send card expiring email:", emailError);
      }
    }
  }

  return {
    invalidated: expiredCards.length,
    warned,
  };
}

/**
 * Get professionals without payment methods
 */
export async function getProfessionalsWithoutPaymentMethod(): Promise<
  Array<{
    id: string;
    name: string;
    pendingFees: number;
  }>
> {
  const professionals = await prisma.professional.findMany({
    where: {
      hasValidPaymentMethod: false,
      applications: {
        some: { status: "APPROVED" },
      },
    },
    select: {
      id: true,
      name: true,
      feeCharges: {
        where: {
          status: { in: ["pending", "failed"] },
        },
        select: {
          amountToCharge: true,
        },
      },
    },
  });

  return professionals.map((pro) => ({
    id: pro.id,
    name: pro.name,
    pendingFees: pro.feeCharges.reduce((sum, fc) => sum + fc.amountToCharge, 0),
  }));
}
