// lib/websocket/types.ts
export interface WSMessage {
  type: string;
  conversationId?: string;
  message?: ChatMessage;
  odI?: string;
  error?: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  imageUrl?: string | null;
  createdAt: string;
  senderId: string;
  userId: string;
  isAudio: boolean;
  isSystem?: boolean;
  proposalId?: string | null;
  proposalStatus?: string | null;
  initiator?: string | null;
  sender: {
    name: string;
    profileImage: string | null;
    isProfessional: boolean;
    userId: string | null;
  };
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
