// lib/constants/application-status.ts
import {
  Clock,
  FileText,
  Video,
  CheckCircle,
  XCircle,
  AlertCircle,
  Ban,
} from "lucide-react";

export type ProOnboardingStatus =
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

export type VenueType = "host" | "visit" | "both";

export interface StatusConfig {
  label: string;
  color: string;
  bgColor: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

export const STATUS_CONFIG: Record<ProOnboardingStatus, StatusConfig> = {
  FORM_PENDING: {
    label: "Form Pending",
    color: "text-gray-500",
    bgColor: "bg-gray-100",
    icon: Clock,
    description: "User has started but not submitted the form",
  },
  FORM_SUBMITTED: {
    label: "Form Submitted",
    color: "text-gray-600",
    bgColor: "bg-gray-100",
    icon: FileText,
    description: "Form submitted, awaiting video",
  },
  VIDEO_PENDING: {
    label: "Video Pending",
    color: "text-orange-500",
    bgColor: "bg-orange-100",
    icon: Video,
    description: "Needs to watch onboarding video",
  },
  QUIZ_PENDING: {
    label: "Quiz Pending",
    color: "text-yellow-500",
    bgColor: "bg-yellow-100",
    icon: Clock,
    description: "Video completed, quiz not taken",
  },
  QUIZ_PASSED: {
    label: "Quiz Passed",
    color: "text-green-500",
    bgColor: "bg-green-100",
    icon: CheckCircle,
    description: "Passed quiz, awaiting review",
  },
  QUIZ_FAILED: {
    label: "Quiz Failed",
    color: "text-red-500",
    bgColor: "bg-red-100",
    icon: XCircle,
    description: "Failed quiz, in cooldown",
  },
  ADMIN_REVIEW: {
    label: "Admin Review",
    color: "text-blue-500",
    bgColor: "bg-blue-100",
    icon: AlertCircle,
    description: "Ready for admin approval",
  },
  APPROVED: {
    label: "Approved",
    color: "text-emerald-500",
    bgColor: "bg-emerald-100",
    icon: CheckCircle,
    description: "Application approved",
  },
  REJECTED: {
    label: "Rejected",
    color: "text-rose-500",
    bgColor: "bg-rose-100",
    icon: XCircle,
    description: "Application rejected",
  },
  SUSPENDED: {
    label: "Suspended",
    color: "text-purple-500",
    bgColor: "bg-purple-100",
    icon: Ban,
    description: "Account suspended",
  },
};

export const VENUE_LABELS: Record<VenueType, string> = {
  host: "I host at my location",
  visit: "I visit the client",
  both: "Both (host and visit)",
};

export const VENUE_ICONS: Record<VenueType, string> = {
  host: "🏠",
  visit: "🚗",
  both: "✨",
};

// Helper to format cooldown time
export function formatCooldown(isoDate: string): string {
  const ms = new Date(isoDate).getTime() - Date.now();
  if (ms <= 0) return "Eligible now";

  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

// Helper to format video progress
export function formatVideoProgress(
  watchedSec: number,
  durationSec: number
): string {
  const percent =
    durationSec > 0 ? Math.round((watchedSec / durationSec) * 100) : 0;
  return `${percent}%`;
}
