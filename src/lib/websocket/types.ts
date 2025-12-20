// src/lib/websocket/types.ts

import type { ChatMessage } from "@/types/chat";

export interface Notification {
  id: string;
  userId: string;
  senderId?: string;
  type: "message" | "appointment" | "payment" | "profile_visit";
  content: string;
  timestamp: string;
  unread: string;
  unreadBool: boolean;
  relatedId?: string;
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
    | string; // Keep string for backwards compatibility
  conversationId?: string;
  message?: ChatMessage;
  notification?: Notification;
  userId?: string;
  error?: string;
}

export interface WSConfig {
  url: string;
  token: string;
  conversationIds?: string[];
  onMessage?: (message: WSMessage) => void;
  onNotification?: (notification: Notification) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}
