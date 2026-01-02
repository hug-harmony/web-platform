// src/lib/notifications-sns.ts
/**
 * SNS-based notification publishing
 * This is the preferred method for production - fire and forget
 */

import { PublishCommand } from "@aws-sdk/client-sns";
import { getSNSClient, TOPICS, isSNSConfigured } from "@/lib/aws/clients";

export type NotificationType =
  | "message"
  | "appointment"
  | "payment"
  | "profile_visit"
  | "video_call";

export interface NotificationPayload {
  targetUserId: string;
  type: NotificationType;
  content: string;
  senderId?: string;
  relatedId?: string;
  skipWebSocket?: boolean;
  skipPush?: boolean;
  metadata?: Record<string, unknown>;
}

export interface PublishResult {
  messageId: string | undefined;
  published: boolean;
}

/**
 * Publish a notification to SNS for async processing
 * This is non-blocking and returns immediately after publishing
 */
export async function publishNotification(
  payload: NotificationPayload
): Promise<PublishResult> {
  // Validate payload
  if (!payload.targetUserId || !payload.type || !payload.content) {
    throw new Error("Invalid notification payload: missing required fields");
  }

  // Check if SNS is configured
  if (!isSNSConfigured()) {
    console.warn(
      "SNS not configured (NOTIFICATION_TOPIC_ARN missing), notification will not be sent asynchronously"
    );
    return { messageId: undefined, published: false };
  }

  const snsClient = getSNSClient();

  try {
    const result = await snsClient.send(
      new PublishCommand({
        TopicArn: TOPICS.NOTIFICATIONS,
        Message: JSON.stringify(payload),
        MessageAttributes: {
          type: {
            DataType: "String",
            StringValue: payload.type,
          },
          targetUserId: {
            DataType: "String",
            StringValue: payload.targetUserId,
          },
          ...(payload.senderId && {
            senderId: {
              DataType: "String",
              StringValue: payload.senderId,
            },
          }),
        },
      })
    );

    console.log(
      `Published notification to SNS: ${result.MessageId} for user ${payload.targetUserId}`
    );

    return { messageId: result.MessageId, published: true };
  } catch (error) {
    console.error("Failed to publish notification to SNS:", error);
    throw error;
  }
}

/**
 * Publish multiple notifications in parallel
 */
export async function publishNotifications(
  payloads: NotificationPayload[]
): Promise<{ successful: number; failed: number }> {
  if (payloads.length === 0) {
    return { successful: 0, failed: 0 };
  }

  const results = await Promise.allSettled(
    payloads.map((payload) => publishNotification(payload))
  );

  const successful = results.filter(
    (r) => r.status === "fulfilled" && r.value.published
  ).length;
  const failed = results.length - successful;

  console.log(`Published ${successful} notifications, ${failed} failed`);

  return { successful, failed };
}

// ==========================================
// Helper Functions - Use these in your code
// ==========================================

/**
 * Notify about a profile visit (async via SNS)
 */
export async function notifyProfileVisit(
  visitorId: string,
  visitorName: string,
  visitedUserId: string
): Promise<PublishResult> {
  // Don't notify if user visits their own profile
  if (visitorId === visitedUserId) {
    return { messageId: undefined, published: false };
  }

  return publishNotification({
    targetUserId: visitedUserId,
    type: "profile_visit",
    content: `${visitorName} viewed your profile`,
    senderId: visitorId,
    relatedId: visitorId,
  });
}

/**
 * Notify about a new message (async via SNS)
 */
export async function notifyNewMessage(
  senderId: string,
  senderName: string,
  recipientId: string,
  conversationId: string,
  messagePreview?: string
): Promise<PublishResult> {
  const preview = messagePreview
    ? messagePreview.length > 50
      ? messagePreview.substring(0, 50) + "..."
      : messagePreview
    : "sent you a message";

  return publishNotification({
    targetUserId: recipientId,
    type: "message",
    content: `${senderName}: ${preview}`,
    senderId,
    relatedId: conversationId,
  });
}

/**
 * Notify about an appointment update (async via SNS)
 */
export async function notifyAppointment(
  targetUserId: string,
  content: string,
  appointmentId: string,
  senderId?: string
): Promise<PublishResult> {
  return publishNotification({
    targetUserId,
    type: "appointment",
    content,
    senderId,
    relatedId: appointmentId,
  });
}

/**
 * Notify about a payment update (async via SNS)
 */
export async function notifyPayment(
  targetUserId: string,
  content: string,
  paymentId: string,
  senderId?: string
): Promise<PublishResult> {
  return publishNotification({
    targetUserId,
    type: "payment",
    content,
    senderId,
    relatedId: paymentId,
  });
}

/**
 * Notify about a video call (async via SNS)
 */
export async function notifyVideoCall(
  targetUserId: string,
  callerName: string,
  sessionId: string,
  senderId: string
): Promise<PublishResult> {
  return publishNotification({
    targetUserId,
    type: "video_call",
    content: `${callerName} is calling you`,
    senderId,
    relatedId: sessionId,
  });
}

/**
 * Notify about earning confirmation (async via SNS)
 */
export async function notifyEarningConfirmed(
  professionalUserId: string,
  amount: number,
  clientName: string,
  earningId: string
): Promise<PublishResult> {
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);

  return publishNotification({
    targetUserId: professionalUserId,
    type: "payment",
    content: `Earning of ${formattedAmount} confirmed for session with ${clientName}`,
    relatedId: earningId,
  });
}

/**
 * Notify about payout processing (async via SNS)
 */
export async function notifyPayoutProcessed(
  professionalUserId: string,
  amount: number,
  payoutId: string
): Promise<PublishResult> {
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);

  return publishNotification({
    targetUserId: professionalUserId,
    type: "payment",
    content: `Your payout of ${formattedAmount} has been processed!`,
    relatedId: payoutId,
  });
}

/**
 * Notify about confirmation request (async via SNS)
 */
export async function notifyConfirmationRequest(
  targetUserId: string,
  otherPartyName: string,
  appointmentId: string,
  isReminder: boolean = false
): Promise<PublishResult> {
  const content = isReminder
    ? `Reminder: Please confirm your session with ${otherPartyName}`
    : `Please confirm if your session with ${otherPartyName} occurred`;

  return publishNotification({
    targetUserId,
    type: "appointment",
    content,
    relatedId: appointmentId,
  });
}

/**
 * Notify admin about a dispute (async via SNS)
 */
export async function notifyDisputeForAdmin(
  adminUserId: string,
  clientName: string,
  professionalName: string,
  confirmationId: string
): Promise<PublishResult> {
  return publishNotification({
    targetUserId: adminUserId,
    type: "payment",
    content: `Payment dispute between ${clientName} and ${professionalName} requires review`,
    relatedId: confirmationId,
  });
}

/**
 * Notify about appointment booking (async via SNS)
 */
export async function notifyAppointmentBooked(
  professionalUserId: string,
  clientName: string,
  appointmentTime: Date,
  appointmentId: string,
  clientId: string
): Promise<PublishResult> {
  const formattedTime = appointmentTime.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return publishNotification({
    targetUserId: professionalUserId,
    type: "appointment",
    content: `${clientName} booked an appointment for ${formattedTime}`,
    senderId: clientId,
    relatedId: appointmentId,
  });
}

/**
 * Notify about appointment cancellation (async via SNS)
 */
export async function notifyAppointmentCancelled(
  targetUserId: string,
  otherPartyName: string,
  appointmentTime: Date,
  appointmentId: string,
  cancelledById: string
): Promise<PublishResult> {
  const formattedTime = appointmentTime.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return publishNotification({
    targetUserId,
    type: "appointment",
    content: `${otherPartyName} cancelled the appointment for ${formattedTime}`,
    senderId: cancelledById,
    relatedId: appointmentId,
  });
}

/**
 * Notify about appointment rescheduling (async via SNS)
 */
export async function notifyAppointmentRescheduled(
  targetUserId: string,
  otherPartyName: string,
  newTime: Date,
  appointmentId: string,
  rescheduledById: string
): Promise<PublishResult> {
  const formattedTime = newTime.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return publishNotification({
    targetUserId,
    type: "appointment",
    content: `${otherPartyName} rescheduled your appointment to ${formattedTime}`,
    senderId: rescheduledById,
    relatedId: appointmentId,
  });
}
