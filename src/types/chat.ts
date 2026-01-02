// src/types/chat.ts
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
  initiator?: "user" | "professional" | null;
  sender: {
    name: string;
    profileImage: string | null;
    isProfessional: boolean;
    userId: string | null;
  };
  conversationId: string;
  type?: "text" | "image" | "audio";
  edited?: boolean;
  deletedAt?: string | null;
}

export interface Participant {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  profileImage?: string | null;
  lastOnline?: Date | string | null;
  isProfessional?: boolean;
}

export interface ConversationUser {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  profileImage?: string | null;
  lastOnline?: Date | string | null;
  biography?: string | null;
  location?: string | null;
  createdAt?: Date | string | null;
  isVerified?: boolean;
  isProfessional?: boolean;
  professionalId?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
}

export interface ConversationLastMessage {
  id: string;
  text: string;
  createdAt: string;
  senderId: string;
  type?: "text" | "image" | "audio";
  read?: boolean;
}

export interface Conversation {
  id: string;
  user1: Participant | ConversationUser;
  user2: Participant | ConversationUser;
  userId1: string;
  userId2: string;
  professionalId?: string | null;
  lastMessage?: ConversationLastMessage | null;
  messageCount?: number;
  unreadCount?: number;
  updatedAt?: string;
  isPinned?: boolean;
  isArchived?: boolean;
}

export interface ConversationWithMessages extends Conversation {
  messages: ChatMessage[];
  hasMore?: boolean;
}

export interface Proposal {
  id: string;
  userId: string;
  professionalId: string;
  conversationId: string;
  startTime: string | null;
  endTime: string | null;
  venue: "host" | "visit" | null;
  status: "pending" | "accepted" | "rejected";
  initiator: "user" | "professional";
  createdAt: string;
  user?: {
    name: string;
    profileImage?: string | null;
  };
  professional?: {
    name: string;
    rate: number;
    image?: string | null;
  };
}

export interface WSMessage {
  type:
    | "newMessage"
    | "typing"
    | "proposalUpdate"
    | "pong"
    | "error"
    | "editMessage"
    | "deleteMessage";
  conversationId?: string;
  message?: ChatMessage;
  messageId?: string;
  updatedText?: string;
  userId?: string;
  proposalId?: string;
  error?: string;
}
