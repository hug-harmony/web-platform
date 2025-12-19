// types/chat.ts
export interface ChatMessage {
  id: string;
  text: string;
  imageUrl?: string | null;
  createdAt: string;
  senderId: string;
  odI: string;
  isAudio: boolean;
  isSystem?: boolean;
  proposalId?: string | null;
  proposalStatus?: string | null;
  initiator?: "user" | "professional" | null;
  sender: {
    name: string;
    profileImage: string | null;
    isProfessional: boolean;
    odI: string | null;
  };
}

export interface Participant {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  profileImage?: string | null;
  lastOnline?: Date | string | null;
  isProfessional?: boolean;
}

export interface Conversation {
  id: string;
  user1: Participant;
  user2: Participant;
  userId1: string;
  userId2: string;
  professionalId?: string | null;
  lastMessage?: {
    id: string;
    text: string;
    createdAt: string;
    senderId: string;
  } | null;
  messageCount?: number;
  unreadCount?: number;
  updatedAt?: string;
}

export interface ConversationWithMessages extends Conversation {
  messages: ChatMessage[];
  hasMore?: boolean;
}

export interface Proposal {
  id: string;
  odI: string;
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
  type: "newMessage" | "typing" | "proposalUpdate" | "pong" | "error";
  conversationId?: string;
  message?: ChatMessage;
  odI?: string;
  proposalId?: string;
  error?: string;
}
