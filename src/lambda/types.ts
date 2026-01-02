// src/lambda/types.ts

export interface ConnectionRecord {
  connectionId: string;
  userId: string; // FIXED: was "odI"
  visibleConversationId: string;
  conversationIds: string[];
  connectedAt: number;
  ttl: number;
}

export interface WebSocketEvent {
  requestContext: {
    connectionId: string;
    routeKey: string;
    eventType: string;
    domainName: string;
    stage: string;
  };
  queryStringParameters?: Record<string, string>;
  body?: string;
}

export interface WebSocketMessage {
  action: string;
  conversationId?: string;
  message?: unknown;
  userId?: string; // FIXED: was "odI"
}

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
}

export interface NotificationRecord {
  id: string;
  userId: string;
  senderId?: string;
  type: NotificationType;
  content: string;
  timestamp: string;
  unread: string;
  unreadBool: boolean;
  relatedId?: string;
  ttl: number;
}

export interface VideoCallSignal {
  type:
    | "video_invite"
    | "video_accept"
    | "video_decline"
    | "video_end"
    | "video_join";
  sessionId: string;
  senderId: string;
  senderName: string;
  targetUserId: string;
  appointmentId?: string;
  timestamp: string;
}
