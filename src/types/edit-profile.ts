// src/types/edit-profile.ts

export type OnboardingStep =
  | "FORM_PENDING"
  | "FORM_SUBMITTED"
  | "VIDEO_PENDING"
  | "QUIZ_PENDING"
  | "QUIZ_PASSED"
  | "QUIZ_FAILED"
  | "ADMIN_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "SUSPENDED";

export interface OnboardingStatus {
  step: OnboardingStep;
  application: {
    status: OnboardingStep;
    submittedAt?: string;
    videoWatchedAt?: string;
    quizPassedAt?: string;
    professionalId?: string;
  };
  video?: {
    watchedSec: number;
    durationSec: number;
    isCompleted: boolean;
  };
}

export interface Profile {
  id: string;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phoneNumber?: string | null;
  profileImage?: string | null;
  location?: string | null;
  biography?: string | null;
  email: string;
  type: "user" | "professional";
  rating?: number | null;
  reviewCount?: number | null;
  rate?: number | null;
  venue?: "host" | "visit" | "both" | null;
  relationshipStatus?: string | null;
  orientation?: string | null;
  height?: string | null;
  ethnicity?: string | null;
  zodiacSign?: string | null;
  favoriteColor?: string | null;
  favoriteMedia?: string | null;
  petOwnership?: string | null;
  photos?: {
    id: string;
    url: string;
  }[];
}

export interface LocationResult {
  lat: string;
  lon: string;
  display_name: string;
}
