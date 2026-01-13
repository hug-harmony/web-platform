// src/types/profile.ts

export type ProfileType = "user" | "professional";

export interface BaseProfile {
  id: string;
  type: ProfileType;
  name: string;
  image?: string;
  location?: string;
  biography?: string;
  lastOnline?: Date | string | null;
  createdAt?: string;

  // Personal info (shared)
  relationshipStatus?: string;
  orientation?: string;
  height?: string;
  ethnicity?: string;
  zodiacSign?: string;
  favoriteColor?: string;
  favoriteMedia?: string;
  petOwnership?: string;

  // Photos
  photos?: { id: string; url: string }[];
}

export interface UserProfile extends BaseProfile {
  type: "user";
  email?: string;
  firstName?: string;
  lastName?: string;

  // Professional application status (if any)
  professionalApplication?: {
    status: string | null;
    professionalId: string | null;
  } | null;
}

export interface ProfessionalProfile extends BaseProfile {
  type: "professional";

  // Professional-specific fields
  rate?: number;
  offersVideo?: boolean;
  videoRate?: number;
  rating?: number;
  reviewCount?: number;
  venue?: "host" | "visit" | "video" | "both";
  userId?: string; // The linked user's ID for messaging

  // NEW: Payment acceptance methods
  paymentAcceptanceMethods?: string[];

  // Reviews
  reviews?: ProfileReview[];

  // Discounts
  discounts?: ProfileDiscount[];
}

export interface ProfileReview {
  id: string;
  rating: number;
  feedback: string;
  reviewerName: string;
  reviewerId?: string;
  createdAt: string;
}

export interface ProfileDiscount {
  id: string;
  name: string;
  rate: number;
  discount: number;
  createdAt?: string;
  updatedAt?: string;
}

// Union type for any profile
export type Profile = UserProfile | ProfessionalProfile;

// Type guard functions
export function isProfessionalProfile(
  profile: Profile
): profile is ProfessionalProfile {
  return profile.type === "professional";
}

export function isUserProfile(profile: Profile): profile is UserProfile {
  return profile.type === "user";
}
