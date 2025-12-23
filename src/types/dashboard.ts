// src/types/dashboard.ts

export interface DashboardUser {
  id: string;
  name: string;
  email: string;
  profileImage: string;
  firstName: string;
  lastName: string;
  heardFrom: string | null;
  heardFromOther: string | null;
}

export interface ConversationUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  profileImage: string | null;
  lastOnline: string | null;
}

export interface LastMessage {
  id: string;
  text: string;
  createdAt: string;
  senderId: string;
}

export interface Conversation {
  id: string;
  user1: ConversationUser | null;
  user2: ConversationUser | null;
  lastMessage: LastMessage | null;
  messageCount: number;
  unreadCount: number;
  updatedAt: string;
}

export interface Appointment {
  _id: string;
  startTime: string;
  endTime: string;
  professionalName: string;
  clientName: string;
  status: "upcoming" | "completed" | "cancelled" | "disputed";
  rate: number;
  venue: string | null;
  professionalId: string;
  professionalUserId: string;
  clientId: string;
  disputeStatus: string;
  rating: number;
  reviewCount: number;
}

export interface DashboardData {
  user: DashboardUser | null;
  conversations: Conversation[];
  appointments: Appointment[];
  loading: boolean;
  error: string | null;
}
