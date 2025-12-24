// lib/constants/application-status.ts
import {
  Clock,
  FileText,
  Video,
  CheckCircle,
  XCircle,
  AlertCircle,
  Ban,
  PlayCircle,
  ClipboardCheck,
  Sparkles,
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

export interface BannerConfig {
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  buttonText: string;
  progress: number;
  variant: "default" | "warning" | "success" | "error";
}

const BASE_PATH = "/dashboard/edit-profile/professional-application";

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

// Banner configuration for the application progress banner
export const BANNER_CONFIG: Record<ProOnboardingStatus, BannerConfig> = {
  FORM_PENDING: {
    label: "Complete Your Application",
    shortLabel: "Step 1 of 4",
    description: "Fill out the application form to get started",
    icon: FileText,
    href: BASE_PATH,
    buttonText: "Complete Form",
    progress: 10,
    variant: "default",
  },
  FORM_SUBMITTED: {
    label: "Watch Training Video",
    shortLabel: "Step 2 of 4",
    description: "Learn about our platform guidelines",
    icon: PlayCircle,
    href: `${BASE_PATH}/video`,
    buttonText: "Watch Video",
    progress: 25,
    variant: "default",
  },
  VIDEO_PENDING: {
    label: "Watch Training Video",
    shortLabel: "Step 2 of 4",
    description: "Learn about our platform guidelines",
    icon: PlayCircle,
    href: `${BASE_PATH}/video`,
    buttonText: "Watch Video",
    progress: 35,
    variant: "default",
  },
  QUIZ_PENDING: {
    label: "Take the Quiz",
    shortLabel: "Step 3 of 4",
    description: "Pass the quiz to continue (80% required)",
    icon: ClipboardCheck,
    href: `${BASE_PATH}/quiz`,
    buttonText: "Start Quiz",
    progress: 60,
    variant: "default",
  },
  QUIZ_FAILED: {
    label: "Quiz Retry Available",
    shortLabel: "Step 3 of 4",
    description: "Check your cooldown status and retry",
    icon: AlertCircle,
    href: `${BASE_PATH}/quiz/cooldown`,
    buttonText: "Check Cooldown",
    progress: 55,
    variant: "warning",
  },
  QUIZ_PASSED: {
    label: "Under Admin Review",
    shortLabel: "Step 4 of 4",
    description: "Your application is being reviewed",
    icon: Clock,
    href: `${BASE_PATH}/status`,
    buttonText: "View Status",
    progress: 85,
    variant: "default",
  },
  ADMIN_REVIEW: {
    label: "Under Admin Review",
    shortLabel: "Step 4 of 4",
    description: "We'll notify you once approved",
    icon: Clock,
    href: `${BASE_PATH}/status`,
    buttonText: "View Status",
    progress: 85,
    variant: "default",
  },
  APPROVED: {
    label: "You're Approved! 🎉",
    shortLabel: "Complete",
    description: "Welcome to the professional team!",
    icon: Sparkles,
    href: "/dashboard",
    buttonText: "Go to Dashboard",
    progress: 100,
    variant: "success",
  },
  REJECTED: {
    label: "Application Not Approved",
    shortLabel: "Action Required",
    description: "You can submit a new application",
    icon: XCircle,
    href: BASE_PATH,
    buttonText: "Reapply",
    progress: 0,
    variant: "error",
  },
  SUSPENDED: {
    label: "Application Suspended",
    shortLabel: "Contact Support",
    description: "Please reach out to our support team",
    icon: Ban,
    href: "/support",
    buttonText: "Contact Support",
    progress: 0,
    variant: "error",
  },
};

// Steps for the status page timeline
export const APPLICATION_STEPS = [
  {
    key: "FORM" as const,
    label: "Submit Application",
    description: "Complete the application form with your details",
    icon: FileText,
    statuses: ["FORM_PENDING", "FORM_SUBMITTED"] as ProOnboardingStatus[],
  },
  {
    key: "VIDEO" as const,
    label: "Watch Training Video",
    description: "Learn about our platform and guidelines",
    icon: Video,
    statuses: ["VIDEO_PENDING"] as ProOnboardingStatus[],
  },
  {
    key: "QUIZ" as const,
    label: "Pass the Quiz",
    description: "Demonstrate your understanding (80% required)",
    icon: ClipboardCheck,
    statuses: [
      "QUIZ_PENDING",
      "QUIZ_PASSED",
      "QUIZ_FAILED",
    ] as ProOnboardingStatus[],
  },
  {
    key: "REVIEW" as const,
    label: "Admin Review",
    description: "Our team will review your application",
    icon: Clock,
    statuses: ["ADMIN_REVIEW"] as ProOnboardingStatus[],
  },
  {
    key: "APPROVED" as const,
    label: "Approved!",
    description: "Welcome to the professional team",
    icon: CheckCircle,
    statuses: ["APPROVED"] as ProOnboardingStatus[],
  },
];

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

// Helper to check if application is in progress (not none, approved, or terminal)
export function isApplicationInProgress(
  status: ProOnboardingStatus | null | undefined
): boolean {
  if (!status) return false;
  return !["APPROVED", "REJECTED", "SUSPENDED"].includes(status);
}

// Helper to check if user has started application
export function hasStartedApplication(
  status: ProOnboardingStatus | null | undefined
): boolean {
  return status !== null && status !== undefined;
}

// Helper to get step index from status
export function getStepIndexFromStatus(status: ProOnboardingStatus): number {
  const stepMap: Record<ProOnboardingStatus, number> = {
    FORM_PENDING: 0,
    FORM_SUBMITTED: 0,
    VIDEO_PENDING: 1,
    QUIZ_PENDING: 2,
    QUIZ_PASSED: 3,
    QUIZ_FAILED: 2,
    ADMIN_REVIEW: 3,
    APPROVED: 4,
    REJECTED: -1,
    SUSPENDED: -1,
  };
  return stepMap[status] ?? 0;
}

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
