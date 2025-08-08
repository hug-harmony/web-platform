export type User = {
  id?: string;
  email: string;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  password?: string | null;
  phoneNumber?: string | null;
  googleId?: string | null;
  profileImage?: string | null;
  createdAt?: Date;
};

export type Specialist = {
  id?: string;
  name: string;
  image?: string | null;
  location: string;
  rating?: number | null;
  reviewCount?: number | null;
  rate?: number | null;
  role?: string | null;
  tags?: string | null;
  biography?: string | null;
  education?: string | null;
  license?: string | null;
  createdAt?: Date;
};

export type Conversation = {
  id?: string;
  userId1?: string | null;
  userId2?: string | null;
  specialistId1?: string | null;
  specialistId2?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  messages?: Message[];
};

export type Message = {
  id?: string;
  text: string;
  isAudio: boolean;
  senderId: string;
  recipientId: string;
  conversationId: string;
  createdAt?: Date;
};
