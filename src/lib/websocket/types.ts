// src/lib/websocket/types.ts
import type { ChatMessage } from "@/types/chat";

export interface Notification {
  id: string;
  userId: string;
  senderId?: string;
  type: "message" | "appointment" | "payment" | "profile_visit" | "video_call";
  content: string;
  timestamp: string;
  unread: string;
  unreadBool: boolean;
  relatedId?: string;
}

// Video call signaling types
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

export interface WSMessage {
  type:
    | "newMessage"
    | "typing"
    | "joined"
    | "pong"
    | "error"
    | "notification"
    | "notificationSent"
    | "onlineStatus"
    | "heartbeatAck"
    | "videoCallSignal" // NEW
    | "videoCallIncoming" // NEW
    | string;
  conversationId?: string;
  message?: ChatMessage;
  notification?: Notification;
  userId?: string;
  isOnline?: boolean;
  lastOnline?: string;
  timestamp?: string;
  error?: string;
  videoSignal?: VideoCallSignal; // NEW
}

export interface WSConfig {
  url: string;
  token: string;
  conversationIds?: string[];
  onMessage?: (message: WSMessage) => void;
  onNotification?: (notification: Notification) => void;
  onOnlineStatusChange?: (userId: string, isOnline: boolean) => void;
  onVideoCallSignal?: (signal: VideoCallSignal) => void; // NEW
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}
