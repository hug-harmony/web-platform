// src/types/operations.ts

// ============================================
// Enums / Constants
// ============================================

export const FEEDBACK_CATEGORIES = [
  "general",
  "bug",
  "feature",
  "complaint",
  "suggestion",
  "other",
] as const;

export const OPERATION_STATUSES = [
  "pending",
  "in_progress",
  "resolved",
  "closed",
] as const;

export const PRIORITIES = ["low", "normal", "high", "urgent"] as const;

export const OPERATION_TYPES = ["feedback", "report", "dispute"] as const;

export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];
export type OperationStatus = (typeof OPERATION_STATUSES)[number];
export type Priority = (typeof PRIORITIES)[number];
export type OperationType = (typeof OPERATION_TYPES)[number];

// ============================================
// Base Interfaces
// ============================================

export interface UserSummary {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  profileImage?: string | null;
}

export interface ProfessionalSummary {
  id: string;
  name: string;
  image?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  location?: string | null;
  userId?: string;
  userEmail?: string;
}

// ============================================
// Feedback
// ============================================

export interface Feedback {
  id: string;
  userId: string;
  category: FeedbackCategory;
  subject: string;
  message: string;
  status: OperationStatus;
  priority: Priority;
  adminResponse: string | null;
  adminRespondedBy: string | null;
  adminRespondedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  user: UserSummary;
  adminUser?: UserSummary | null;
}

export interface CreateFeedbackInput {
  category: FeedbackCategory;
  subject: string;
  message: string;
}

// ============================================
// Report (User/Professional Violations)
// ============================================

export interface Report {
  id: string;
  reporterId: string;
  reportedUserId: string | null;
  reportedProfessionalId: string | null;
  reason: string;
  details: string | null;
  status: OperationStatus;
  priority: Priority;
  adminResponse: string | null;
  adminRespondedBy: string | null;
  adminRespondedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  reporter: UserSummary;
  reportedUser?: UserSummary | null;
  reportedProfessional?: ProfessionalSummary | null;
  adminUser?: UserSummary | null;
}

// ============================================
// Dispute (from Appointments)
// ============================================

export interface Dispute {
  id: string; // Appointment ID
  userId: string | null;
  professionalId: string;
  startTime: Date;
  endTime: Date;
  status: string;
  disputeStatus: string;
  disputeReason: string | null;
  adminNotes: string | null;
  createdAt: Date;
  user: UserSummary | null;
  professional: ProfessionalSummary & {
    userId?: string;
    userEmail?: string;
  };
}

// ============================================
// Appointment Details (for disputes)
// ============================================

export interface AppointmentDetails {
  startTime: Date;
  endTime: Date;
  status: string;
  payment?: {
    id: string;
    amount: number;
    status: string;
    stripeId?: string | null;
  } | null;
  confirmation?: {
    id: string;
    clientConfirmed: boolean | null;
    professionalConfirmed: boolean | null;
    finalStatus: string;
    isDisputed: boolean;
  } | null;
}

// ============================================
// Unified Operation Item (for Operations page)
// ============================================

export interface OperationItem {
  id: string;
  type: OperationType;
  status: string;
  priority: Priority;
  subject: string; // Title/reason for display
  description: string | null; // Details/message
  category?: FeedbackCategory; // For feedback items
  createdAt: Date;
  updatedAt?: Date;

  // Who submitted
  submittedBy: UserSummary | null;

  // Who it's about (for reports)
  targetUser?: UserSummary | null;
  targetProfessional?: ProfessionalSummary | null;

  // Admin response
  adminResponse: string | null;
  adminRespondedBy: UserSummary | null;
  adminRespondedAt: Date | null;

  // Appointment details for disputes
  appointmentDetails?: AppointmentDetails;

  // Original data for detailed view
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  originalData: any;
}

// ============================================
// API Request/Response Types
// ============================================

export interface OperationsFilters {
  type?: OperationType | "all";
  status?: OperationStatus | "all";
  priority?: Priority | "all";
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface OperationsResponse {
  items: OperationItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  stats: OperationsStats;
}

export interface OperationsStats {
  total: number;
  byType: {
    feedback: number;
    report: number;
    dispute: number;
  };
  byStatus: {
    pending: number;
    in_progress: number;
    resolved: number;
    closed: number;
  };
  byPriority: {
    low: number;
    normal: number;
    high: number;
    urgent: number;
  };
  // For chart
  byDate: {
    date: string; // YYYY-MM-DD
    count: number;
    byType: {
      feedback: number;
      report: number;
      dispute: number;
    };
  }[];
}

export interface UpdateOperationInput {
  status?: OperationStatus;
  priority?: Priority;
  adminResponse?: string;
}

export interface UpdateOperationResponse {
  success: boolean;
  message: string;
  item: OperationItem;
}

// ============================================
// UI Helper Types
// ============================================

export interface StatusBadgeProps {
  status: OperationStatus | string;
}

export interface PriorityBadgeProps {
  priority: Priority;
}

export const STATUS_COLORS: Record<string, string> = {
  pending:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  resolved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  closed: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  disputed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  confirmed_canceled:
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  denied:
    "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  low: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200",
  normal: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  urgent: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export const TYPE_COLORS: Record<OperationType, string> = {
  feedback:
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  report: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  dispute:
    "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

export const CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  general: "General",
  bug: "Bug Report",
  feature: "Feature Request",
  complaint: "Complaint",
  suggestion: "Suggestion",
  other: "Other",
};
