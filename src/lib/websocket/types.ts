// src/lib/websocket/types.ts

import type { ChatMessage } from "@/types/chat";

export interface WSMessage {
  type: string;
  conversationId?: string;
  message?: ChatMessage;
  userId?: string;
  error?: string;
}

export interface WSConfig {
  url: string;
  token: string;
  conversationIds?: string[];
  onMessage?: (message: WSMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}
