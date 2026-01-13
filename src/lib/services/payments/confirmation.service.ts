
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
  markEarningNotOccurred,
  // disputeEarning,
  getPlatformFeePercent,
} from "./earnings.service";
import { createAppointmentNotification } from "@/lib/notifications";
import { buildDisplayName } from "@/lib/utils";
import { castConfirmationStatus, castDisputeResolution } from "./helpers";
import {
  sendSessionCompletedEmail,
  sendConfirmationNeededEmail,
} from "@/lib/services/email";

// ============================================
// CONFIRMATION CREATION
// ============================================

/**
 * Create a confirmation record when an appointment is completed
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
            select: {
              userId: true,
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
      },
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  if (!appointment) {
    throw new Error("Appointment not found");
  }

  if (!appointment.userId || !appointment.user) {
    throw new Error("Appointment has no client");
  }

  if (!appointment.professional) {
    throw new Error("Appointment has no professional");
  }

  const professionalApplication = appointment.professional.applications[0];
  if (!professionalApplication?.userId) {
    throw new Error("Could not find professional user ID");
  }

  const professionalUserId = professionalApplication.userId;
  const professionalUser = professionalApplication.user;

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

  // Calculate amounts for email
  const hourlyRate =
    appointment.adjustedRate ??
    appointment.rate ??
    appointment.professional.rate ??
    0;
  const durationMs =
    appointment.endTime.getTime() - appointment.startTime.getTime();
  const hours = durationMs / (1000 * 60 * 60);
  const grossAmount = Math.round(hourlyRate * hours * 100) / 100;
  const platformFeePercent = await getPlatformFeePercent(
    appointment.professionalId
  );
  const platformFee =
    Math.round(grossAmount * (platformFeePercent / 100) * 100) / 100;

  const clientName = buildDisplayName(appointment.user);
  const professionalName = buildDisplayName(professionalUser);
  const sessionDate = appointment.endTime.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Send notifications to both parties
  await Promise.all([
    createAppointmentNotification(
      appointment.userId,
      "Your appointment has ended. Please confirm if it occurred.",
      appointmentId
    ),
    createAppointmentNotification(
      professionalUserId,
      "Your appointment has ended. Please confirm if it occurred.",
      appointmentId
    ),
  ]);

  // Send email to professional about session completion
  if (professionalUser.email) {
    try {
      await sendSessionCompletedEmail(
        professionalUser.email,
        professionalName,
        clientName,
        sessionDate,
        grossAmount.toFixed(2),
        platformFee.toFixed(2),
        appointmentId
      );
    } catch (emailError) {
      console.error("Failed to send session completed email:", emailError);
      // Don't throw - confirmation is still valid
    }
  }

  // Send email to client asking for confirmation
  if (appointment.user.email) {
    try {
      await sendConfirmationNeededEmail(
        appointment.user.email,
        clientName,
        professionalName,
        sessionDate,
        14, // Days remaining in cycle (approximate)
        appointmentId,
        false // isRecipientProfessional
      );
    } catch (emailError) {
      console.error(
        "Failed to send confirmation needed email to client:",
        emailError
      );
    }
  }

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
          },
          user: {
            select: {
              id: true,
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
      // Both confirm it occurred - create earning
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

  // Handle earning based on final status
  if (finalStatus === "confirmed") {
    // Both confirmed - create earning record
    try {
      await createEarningFromAppointment(appointmentId);
      earningCreated = true;
    } catch (error) {
      console.error("Failed to create earning:", error);
      // Don't throw - confirmation is still valid
    }
  }

  // Get names for notifications
  const clientName = confirmation.appointment.user
    ? buildDisplayName(confirmation.appointment.user)
    : "Client";
  const professionalUser =
    confirmation.appointment.professional.applications[0]?.user;
  const professionalName = professionalUser
    ? buildDisplayName(professionalUser)
    : confirmation.appointment.professional.name;

  // Send notifications
  const otherPartyId =
    userRole === "client"
      ? confirmation.professionalUserId
      : confirmation.clientId;

  const otherPartyEmail =
    userRole === "client"
      ? professionalUser?.email
      : confirmation.appointment.user?.email;

  const otherPartyDisplayName =
    userRole === "client" ? professionalName : clientName;

  const currentUserDisplayName =
    userRole === "client" ? clientName : professionalName;

  const sessionDate = confirmation.appointment.endTime.toLocaleDateString(
    "en-US",
    {
      weekday: "long",
      month: "long",
      day: "numeric",
    }
  );

  if (finalStatus === "disputed") {
    await createAppointmentNotification(
      otherPartyId,
      "There's a disagreement about your appointment. An admin will review this.",
      appointmentId
    );
  } else if (finalStatus === "confirmed") {
    await createAppointmentNotification(
      otherPartyId,
      "Appointment confirmed by both parties!",
      appointmentId
    );
  } else if (finalStatus === "not_occurred") {
    await createAppointmentNotification(
      otherPartyId,
      "Appointment marked as not occurred by both parties.",
      appointmentId
    );
  } else if (otherPartyConfirmed === null) {
    // Still waiting for other party - send reminder email
    const responseText = confirmed ? "occurred" : "did not occur";
    await createAppointmentNotification(
      otherPartyId,
      `The other party marked the appointment as "${responseText}". Please confirm.`,
      appointmentId
    );

    // Send email reminder to other party
    if (otherPartyEmail) {
      try {
        // Calculate days remaining (approximate based on cycle)
        const cycleEnd = new Date();
        const day = cycleEnd.getDate();
        if (day <= 15) {
          cycleEnd.setDate(15);
        } else {
          cycleEnd.setMonth(cycleEnd.getMonth() + 1, 0); // Last day of month
        }
        const daysRemaining = Math.ceil(
          (cycleEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        await sendConfirmationNeededEmail(
          otherPartyEmail,
          otherPartyDisplayName,
          currentUserDisplayName,
          sessionDate,
          daysRemaining,
          appointmentId,
          userRole === "client" // If current user is client, other party is professional
        );
      } catch (emailError) {
        console.error(
          "Failed to send confirmation reminder email:",
          emailError
        );
      }
    }
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
    message: getConfirmationMessage(finalStatus),
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
  // _role: "client" | "professional"
): string {
  switch (status) {
    case "confirmed":
      return "Appointment confirmed! The session has been recorded.";
    case "not_occurred":
      return "Appointment marked as not occurred.";
    case "disputed":
      return "There's a disagreement about this appointment. An admin will review and resolve this.";
    case "pending":
      return "Your response has been recorded. Waiting for the other party to confirm.";
    default:
      return "Confirmation recorded.";
  }
}

// ============================================
// AUTO-CONFIRMATION (for cycle end)
// ============================================

/**
 * Auto-resolve pending confirmations at cycle end
 * Marks them as "not_occurred" if neither/one party confirmed
 */
export async function autoResolveExpiredConfirmations(
  cycleId: string
): Promise<{
  resolved: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let resolved = 0;

  // Get the cycle to check its dates
  const cycle = await prisma.payoutCycle.findUnique({
    where: { id: cycleId },
  });

  if (!cycle) {
    throw new Error("Cycle not found");
  }

  // Get all pending confirmations for appointments that ended within this cycle
  const pendingConfirmations = await prisma.appointmentConfirmation.findMany({
    where: {
      finalStatus: "pending",
      appointment: {
        endTime: {
          gte: cycle.startDate,
          lte: cycle.endDate,
        },
      },
    },
    include: {
      appointment: {
        select: {
          id: true,
          endTime: true,
        },
      },
      client: {
        select: {
          email: true,
          name: true,
          firstName: true,
          lastName: true,
        },
      },
      professionalUser: {
        select: {
          email: true,
          name: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  for (const confirmation of pendingConfirmations) {
    try {
      // Determine the auto-resolve reason
      let autoResolveReason = "deadline_passed";

      if (
        confirmation.clientConfirmed === null &&
        confirmation.professionalConfirmed === null
      ) {
        autoResolveReason = "both_no_response";
      } else if (confirmation.clientConfirmed === null) {
        autoResolveReason = "client_no_response";
      } else if (confirmation.professionalConfirmed === null) {
        autoResolveReason = "professional_no_response";
      }

      // Update confirmation to auto_not_occurred
      await prisma.appointmentConfirmation.update({
        where: { id: confirmation.id },
        data: {
          finalStatus: "auto_not_occurred",
          autoResolvedAt: new Date(),
          autoResolveReason,
        },
      });

      // Check if there was a pending earning and mark it as not_occurred
      const earning = await getEarningByAppointmentId(
        confirmation.appointmentId
      );
      if (earning && earning.status === "pending") {
        await markEarningNotOccurred(earning.id);
      }

      // const clientName = buildDisplayName(confirmation.client);
      // const professionalName = buildDisplayName(confirmation.professionalUser);

      // Notify both parties
      await Promise.all([
        createAppointmentNotification(
          confirmation.clientId,
          "Your appointment was automatically marked as not occurred due to missing confirmation.",
          confirmation.appointmentId
        ),
        createAppointmentNotification(
          confirmation.professionalUserId,
          "Your appointment was automatically marked as not occurred due to missing confirmation.",
          confirmation.appointmentId
        ),
      ]);

      // Note: We don't send emails for auto-resolved confirmations to avoid spam
      // The in-app notification is sufficient

      resolved++;
    } catch (error) {
      errors.push(
        `Confirmation ${confirmation.id}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  return { resolved, errors };
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
      client: {
        select: {
          email: true,
          name: true,
          firstName: true,
          lastName: true,
        },
      },
      professionalUser: {
        select: {
          email: true,
          name: true,
          firstName: true,
          lastName: true,
        },
      },
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

  // Handle earning based on resolution
  if (resolution === "admin_confirmed") {
    // Admin confirmed it occurred - create earning if it doesn't exist
    const existingEarning = await getEarningByAppointmentId(
      confirmation.appointmentId
    );

    if (existingEarning) {
      // Update existing earning to confirmed
      await confirmEarning(existingEarning.id);
    } else {
      // Create new earning
      try {
        await createEarningFromAppointment(confirmation.appointmentId);
      } catch (error) {
        console.error(
          "Failed to create earning after dispute resolution:",
          error
        );
      }
    }
  } else {
    // Admin cancelled - mark earning as not occurred if exists
    const existingEarning = await getEarningByAppointmentId(
      confirmation.appointmentId
    );
    if (existingEarning) {
      await markEarningNotOccurred(existingEarning.id);
    }
  }

  // Update appointment status
  await prisma.appointment.update({
    where: { id: confirmation.appointmentId },
    data: {
      disputeStatus:
        resolution === "admin_confirmed"
          ? "resolved_occurred"
          : "resolved_not_occurred",
      adminNotes,
    },
  });

  // Notify both parties
  const message =
    resolution === "admin_confirmed"
      ? "Admin has confirmed the appointment occurred. Platform fee will be charged at cycle end."
      : "Admin has confirmed the appointment did not occur. No fee will be charged.";

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

  // Note: Email notifications for dispute resolution could be added here
  // but in-app notifications are typically sufficient for admin actions

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

/**
 * Get pending confirmation count for a user
 */
export async function getPendingConfirmationCount(
  userId: string
): Promise<number> {
  return prisma.appointmentConfirmation.count({
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
}

/**
 * Get confirmation stats for a cycle (admin)
 */
export async function getConfirmationStatsForCycle(cycleId: string): Promise<{
  total: number;
  pending: number;
  confirmed: number;
  notOccurred: number;
  autoNotOccurred: number;
  disputed: number;
  disputedResolved: number;
}> {
  const cycle = await prisma.payoutCycle.findUnique({
    where: { id: cycleId },
  });

  if (!cycle) {
    throw new Error("Cycle not found");
  }

  const confirmations = await prisma.appointmentConfirmation.groupBy({
    by: ["finalStatus"],
    where: {
      appointment: {
        endTime: {
          gte: cycle.startDate,
          lte: cycle.endDate,
        },
      },
    },
    _count: true,
  });

  const disputedResolved = await prisma.appointmentConfirmation.count({
    where: {
      isDisputed: true,
      disputeResolvedAt: { not: null },
      appointment: {
        endTime: {
          gte: cycle.startDate,
          lte: cycle.endDate,
        },
      },
    },
  });

  const getCount = (status: string) =>
    confirmations.find((c) => c.finalStatus === status)?._count || 0;

  return {
    total: confirmations.reduce((sum, c) => sum + c._count, 0),
    pending: getCount("pending"),
    confirmed: getCount("confirmed"),
    notOccurred: getCount("not_occurred"),
    autoNotOccurred: getCount("auto_not_occurred"),
    disputed: getCount("disputed"),
    disputedResolved,
  };
}
