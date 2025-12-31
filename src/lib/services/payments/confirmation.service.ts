// src/lib/services/payments/confirmation.service.ts

import prisma from "@/lib/prisma";
import {
  AppointmentConfirmation,
  ConfirmationWithDetails,
  ConfirmAppointmentInput,
  ConfirmationResponse,
  ConfirmationFinalStatus,
} from "@/types/payments";
import {
  createEarningFromAppointment,
  getEarningByAppointmentId,
  confirmEarning,
  cancelEarning,
  disputeEarning,
} from "./earnings.service";
import { createAppointmentNotification } from "@/lib/notifications";
import { buildDisplayName } from "@/lib/utils";
import { castConfirmationStatus, castDisputeResolution } from "./helpers";

// ============================================
// CONFIRMATION CREATION
// ============================================

/**
 * Create a confirmation record when an appointment is completed
 * This should be called when appointment status changes to "completed"
 */
export async function createConfirmation(
  appointmentId: string
): Promise<AppointmentConfirmation> {
  // Get appointment details
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      professional: {
        include: {
          applications: {
            where: { status: "APPROVED" },
            select: { userId: true },
          },
        },
      },
    },
  });

  if (!appointment) {
    throw new Error("Appointment not found");
  }

  if (!appointment.userId) {
    throw new Error("Appointment has no client");
  }

  if (!appointment.professional) {
    throw new Error("Appointment has no professional");
  }

  const professionalUserId = appointment.professional.applications[0]?.userId;
  if (!professionalUserId) {
    throw new Error("Could not find professional user ID");
  }

  // Check if confirmation already exists
  const existing = await prisma.appointmentConfirmation.findUnique({
    where: { appointmentId },
  });

  if (existing) {
    return {
      ...existing,
      finalStatus: castConfirmationStatus(existing.finalStatus),
      disputeResolution: castDisputeResolution(existing.disputeResolution),
    };
  }

  // Create confirmation record
  const confirmation = await prisma.appointmentConfirmation.create({
    data: {
      appointmentId,
      clientId: appointment.userId,
      professionalId: appointment.professionalId,
      professionalUserId,
      finalStatus: "pending",
    },
  });

  // Create pending earning (will be confirmed/cancelled based on confirmation)
  try {
    await createEarningFromAppointment(appointmentId);
  } catch (error) {
    console.error("Failed to create earning for appointment:", error);
    // Don't throw - confirmation is still valid
  }

  // Send notifications to both parties
  await Promise.all([
    createAppointmentNotification(
      appointment.userId,
      "Your appointment has ended. Please confirm if it occurred.",
      appointmentId
    ),
    createAppointmentNotification(
      professionalUserId,
      "Your appointment has ended. Awaiting client confirmation.",
      appointmentId
    ),
  ]);

  return {
    ...confirmation,
    finalStatus: castConfirmationStatus(confirmation.finalStatus),
    disputeResolution: castDisputeResolution(confirmation.disputeResolution),
  };
}

/**
 * Ensure confirmation exists for an appointment
 */
export async function ensureConfirmationExists(
  appointmentId: string
): Promise<AppointmentConfirmation> {
  const existing = await prisma.appointmentConfirmation.findUnique({
    where: { appointmentId },
  });

  if (existing) {
    return {
      ...existing,
      finalStatus: castConfirmationStatus(existing.finalStatus),
      disputeResolution: castDisputeResolution(existing.disputeResolution),
    };
  }

  return createConfirmation(appointmentId);
}

// ============================================
// CONFIRMATION ACTIONS
// ============================================

/**
 * Process a user's confirmation response
 */
export async function confirmAppointment(
  input: ConfirmAppointmentInput,
  userId: string,
  userRole: "client" | "professional"
): Promise<ConfirmationResponse> {
  const { appointmentId, confirmed, reviewData } = input;

  // Get existing confirmation
  const confirmation = await prisma.appointmentConfirmation.findUnique({
    where: { appointmentId },
    include: {
      appointment: {
        include: {
          professional: {
            select: {
              id: true,
              name: true,
              applications: {
                where: { status: "APPROVED" },
                select: {
                  userId: true,
                  user: {
                    select: { name: true, firstName: true, lastName: true },
                  },
                },
              },
            },
          },
          user: {
            select: { id: true, name: true, firstName: true, lastName: true },
          },
        },
      },
    },
  });

  if (!confirmation) {
    throw new Error(
      "Confirmation not found. Appointment may not be completed yet."
    );
  }

  // Verify user has permission
  if (userRole === "client" && confirmation.clientId !== userId) {
    throw new Error("You are not authorized to confirm this appointment");
  }

  if (
    userRole === "professional" &&
    confirmation.professionalUserId !== userId
  ) {
    throw new Error("You are not authorized to confirm this appointment");
  }

  // Check if already responded
  if (userRole === "client" && confirmation.clientConfirmed !== null) {
    throw new Error("You have already responded to this confirmation");
  }

  if (
    userRole === "professional" &&
    confirmation.professionalConfirmed !== null
  ) {
    throw new Error("You have already responded to this confirmation");
  }

  // Update confirmation with user's response
  const updateData: Record<string, unknown> = {};
  const now = new Date();

  if (userRole === "client") {
    updateData.clientConfirmed = confirmed;
    updateData.clientConfirmedAt = now;

    // Handle review if provided and appointment occurred
    if (confirmed && reviewData) {
      const review = await prisma.review.create({
        data: {
          professionalId: confirmation.professionalId,
          reviewerId: userId,
          rating: reviewData.rating,
          feedback: reviewData.feedback,
        },
      });
      updateData.clientReviewId = review.id;

      // Update professional rating
      await updateProfessionalRating(confirmation.professionalId);
    }
  } else {
    updateData.professionalConfirmed = confirmed;
    updateData.professionalConfirmedAt = now;
  }

  // Determine final status
  const otherPartyConfirmed =
    userRole === "client"
      ? confirmation.professionalConfirmed
      : confirmation.clientConfirmed;

  let finalStatus: ConfirmationFinalStatus = "pending";
  let earningCreated = false;
  let disputeCreated = false;

  if (otherPartyConfirmed !== null) {
    // Both parties have responded
    if (confirmed && otherPartyConfirmed) {
      // Both confirm it occurred
      finalStatus = "confirmed";
      earningCreated = true;
    } else if (!confirmed && !otherPartyConfirmed) {
      // Both confirm it did NOT occur
      finalStatus = "not_occurred";
    } else {
      // Disagreement - create dispute
      finalStatus = "disputed";
      disputeCreated = true;
      updateData.isDisputed = true;
      updateData.disputeCreatedAt = now;
    }
  }

  updateData.finalStatus = finalStatus;

  // Update confirmation
  const updatedConfirmation = await prisma.appointmentConfirmation.update({
    where: { id: confirmation.id },
    data: updateData,
  });

  // Handle earning status based on final status
  const earning = await getEarningByAppointmentId(appointmentId);

  if (earning) {
    if (finalStatus === "confirmed") {
      await confirmEarning(earning.id);
    } else if (finalStatus === "not_occurred") {
      await cancelEarning(earning.id);
    } else if (finalStatus === "disputed") {
      await disputeEarning(earning.id);
    }
  }

  // Send notifications
  const otherPartyId =
    userRole === "client"
      ? confirmation.professionalUserId
      : confirmation.clientId;

  if (finalStatus === "disputed") {
    await Promise.all([
      createAppointmentNotification(
        otherPartyId,
        `There's a disagreement about your appointment. An admin will review this.`,
        appointmentId
      ),
      // TODO: Notify admin about the dispute
    ]);
  } else if (finalStatus === "confirmed") {
    await createAppointmentNotification(
      otherPartyId,
      "Appointment confirmed by both parties. Earning recorded.",
      appointmentId
    );
  } else if (finalStatus === "not_occurred") {
    await createAppointmentNotification(
      otherPartyId,
      "Appointment marked as not occurred by both parties.",
      appointmentId
    );
  } else if (otherPartyConfirmed === null) {
    // Still waiting for other party
    const responseText = confirmed ? "occurred" : "did not occur";
    await createAppointmentNotification(
      otherPartyId,
      `The other party marked the appointment as "${responseText}". Please confirm.`,
      appointmentId
    );
  }

  return {
    confirmation: {
      ...updatedConfirmation,
      finalStatus: castConfirmationStatus(updatedConfirmation.finalStatus),
      disputeResolution: castDisputeResolution(
        updatedConfirmation.disputeResolution
      ),
    },
    earningCreated,
    disputeCreated,
    message: getConfirmationMessage(finalStatus, userRole),
  };
}

/**
 * Helper to update professional rating after a review
 */
async function updateProfessionalRating(professionalId: string): Promise<void> {
  const reviews = await prisma.review.findMany({
    where: { professionalId },
    select: { rating: true },
  });

  if (reviews.length === 0) return;

  const avgRating =
    reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

  await prisma.professional.update({
    where: { id: professionalId },
    data: {
      rating: Math.round(avgRating * 10) / 10,
      reviewCount: reviews.length,
    },
  });
}

/**
 * Get user-friendly confirmation message
 */
function getConfirmationMessage(
  status: ConfirmationFinalStatus,
  _role: "client" | "professional"
): string {
  switch (status) {
    case "confirmed":
      return "Appointment confirmed! Earning has been recorded.";
    case "not_occurred":
      return "Appointment marked as not occurred. No payment will be processed.";
    case "disputed":
      return "There's a disagreement about this appointment. An admin will review and resolve this.";
    case "pending":
      return "Your response has been recorded. Waiting for the other party to confirm.";
    default:
      return "Confirmation recorded.";
  }
}

// ============================================
// DISPUTE RESOLUTION
// ============================================

/**
 * Admin resolves a disputed confirmation
 */
export async function resolveDispute(
  confirmationId: string,
  resolution: "admin_confirmed" | "admin_cancelled",
  adminNotes?: string
): Promise<AppointmentConfirmation> {
  const confirmation = await prisma.appointmentConfirmation.findUnique({
    where: { id: confirmationId },
    include: {
      appointment: true,
    },
  });

  if (!confirmation) {
    throw new Error("Confirmation not found");
  }

  if (!confirmation.isDisputed) {
    throw new Error("This confirmation is not disputed");
  }

  const finalStatus: ConfirmationFinalStatus =
    resolution === "admin_confirmed" ? "confirmed" : "not_occurred";

  // Update confirmation
  const updated = await prisma.appointmentConfirmation.update({
    where: { id: confirmationId },
    data: {
      finalStatus,
      disputeResolvedAt: new Date(),
      disputeResolution: resolution,
      disputeReason: adminNotes,
    },
  });

  // Update earning status
  const earning = await getEarningByAppointmentId(confirmation.appointmentId);

  if (earning) {
    if (resolution === "admin_confirmed") {
      await confirmEarning(earning.id);
    } else {
      await cancelEarning(earning.id);
    }
  }

  // Update appointment status
  await prisma.appointment.update({
    where: { id: confirmation.appointmentId },
    data: {
      disputeStatus:
        resolution === "admin_confirmed" ? "denied" : "confirmed_canceled",
      adminNotes,
    },
  });

  // Notify both parties
  const message =
    resolution === "admin_confirmed"
      ? "Admin has confirmed the appointment occurred. Payment will be processed."
      : "Admin has confirmed the appointment did not occur. No payment will be processed.";

  await Promise.all([
    createAppointmentNotification(
      confirmation.clientId,
      message,
      confirmation.appointmentId
    ),
    createAppointmentNotification(
      confirmation.professionalUserId,
      message,
      confirmation.appointmentId
    ),
  ]);

  return {
    ...updated,
    finalStatus: castConfirmationStatus(updated.finalStatus),
    disputeResolution: castDisputeResolution(updated.disputeResolution),
  };
}

// ============================================
// CONFIRMATION RETRIEVAL
// ============================================

/**
 * Get confirmation by ID with details
 */
export async function getConfirmationById(
  confirmationId: string
): Promise<ConfirmationWithDetails | null> {
  const confirmation = await prisma.appointmentConfirmation.findUnique({
    where: { id: confirmationId },
    include: {
      appointment: {
        select: {
          id: true,
          startTime: true,
          endTime: true,
          venue: true,
          rate: true,
          adjustedRate: true,
        },
      },
      client: {
        select: {
          id: true,
          name: true,
          firstName: true,
          lastName: true,
          profileImage: true,
        },
      },
      professional: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!confirmation) return null;

  return {
    ...confirmation,
    finalStatus: castConfirmationStatus(confirmation.finalStatus),
    disputeResolution: castDisputeResolution(confirmation.disputeResolution),
    client: {
      ...confirmation.client,
      name: buildDisplayName(confirmation.client),
    },
  } as ConfirmationWithDetails;
}

/**
 * Get confirmation by appointment ID
 */
export async function getConfirmationByAppointmentId(
  appointmentId: string
): Promise<ConfirmationWithDetails | null> {
  const confirmation = await prisma.appointmentConfirmation.findUnique({
    where: { appointmentId },
    include: {
      appointment: {
        select: {
          id: true,
          startTime: true,
          endTime: true,
          venue: true,
          rate: true,
          adjustedRate: true,
        },
      },
      client: {
        select: {
          id: true,
          name: true,
          firstName: true,
          lastName: true,
          profileImage: true,
        },
      },
      professional: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!confirmation) return null;

  return {
    ...confirmation,
    finalStatus: castConfirmationStatus(confirmation.finalStatus),
    disputeResolution: castDisputeResolution(confirmation.disputeResolution),
    client: {
      ...confirmation.client,
      name: buildDisplayName(confirmation.client),
    },
  } as ConfirmationWithDetails;
}

/**
 * Get pending confirmations for a user
 */
export async function getPendingConfirmations(
  userId: string,
  role: "client" | "professional"
): Promise<ConfirmationWithDetails[]> {
  const where =
    role === "client"
      ? {
          clientId: userId,
          clientConfirmed: null,
          finalStatus: "pending",
        }
      : {
          professionalUserId: userId,
          professionalConfirmed: null,
          finalStatus: "pending",
        };

  const confirmations = await prisma.appointmentConfirmation.findMany({
    where,
    include: {
      appointment: {
        select: {
          id: true,
          startTime: true,
          endTime: true,
          venue: true,
          rate: true,
          adjustedRate: true,
        },
      },
      client: {
        select: {
          id: true,
          name: true,
          firstName: true,
          lastName: true,
          profileImage: true,
        },
      },
      professional: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return confirmations.map((c) => ({
    ...c,
    finalStatus: castConfirmationStatus(c.finalStatus),
    disputeResolution: castDisputeResolution(c.disputeResolution),
    client: {
      ...c.client,
      name: buildDisplayName(c.client),
    },
  })) as ConfirmationWithDetails[];
}

/**
 * Get disputed confirmations (for admin)
 */
export async function getDisputedConfirmations(): Promise<
  ConfirmationWithDetails[]
> {
  const confirmations = await prisma.appointmentConfirmation.findMany({
    where: {
      isDisputed: true,
      disputeResolvedAt: null,
    },
    include: {
      appointment: {
        select: {
          id: true,
          startTime: true,
          endTime: true,
          venue: true,
          rate: true,
          adjustedRate: true,
        },
      },
      client: {
        select: {
          id: true,
          name: true,
          firstName: true,
          lastName: true,
          profileImage: true,
        },
      },
      professional: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      disputeCreatedAt: "desc",
    },
  });

  return confirmations.map((c) => ({
    ...c,
    finalStatus: castConfirmationStatus(c.finalStatus),
    disputeResolution: castDisputeResolution(c.disputeResolution),
    client: {
      ...c.client,
      name: buildDisplayName(c.client),
    },
  })) as ConfirmationWithDetails[];
}

/**
 * Check if user needs to confirm any appointments
 */
export async function hasPendingConfirmations(
  userId: string
): Promise<boolean> {
  const count = await prisma.appointmentConfirmation.count({
    where: {
      OR: [
        { clientId: userId, clientConfirmed: null, finalStatus: "pending" },
        {
          professionalUserId: userId,
          professionalConfirmed: null,
          finalStatus: "pending",
        },
      ],
    },
  });

  return count > 0;
}
