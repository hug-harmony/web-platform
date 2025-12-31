// src/types/payments.ts

// ============================================
// ENUMS (matching Prisma schema string values)
// ============================================

export type CycleStatus = "active" | "processing" | "completed" | "failed";

export type EarningStatus =
  | "pending"
  | "confirmed"
  | "disputed"
  | "cancelled"
  | "paid";

export type PayoutStatus = "pending" | "processing" | "completed" | "failed";

export type ConfirmationFinalStatus =
  | "pending"
  | "confirmed"
  | "not_occurred"
  | "disputed"
  | "auto_confirmed";

export type DisputeResolution = "admin_confirmed" | "admin_cancelled";

// ============================================
// PAYOUT CYCLE TYPES
// ============================================

export interface PayoutCycle {
  id: string;
  startDate: Date;
  endDate: Date;
  cutoffDate: Date;
  status: CycleStatus;
  processedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PayoutCycleWithStats extends PayoutCycle {
  totalEarnings: number;
  totalPlatformFees: number;
  totalNetAmount: number;
  earningsCount: number;
  professionalCount: number;
}

export interface CycleInfo {
  current: PayoutCycle;
  daysRemaining: number;
  hoursUntilCutoff: number;
  isProcessing: boolean;
}

// ============================================
// EARNING TYPES
// ============================================

export interface Earning {
  id: string;
  professionalId: string;
  appointmentId: string;
  cycleId: string;
  grossAmount: number;
  platformFeePercent: number;
  platformFeeAmount: number;
  netAmount: number;
  sessionDurationMinutes: number;
  hourlyRate: number;
  sessionStartTime: Date;
  sessionEndTime: Date;
  status: EarningStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface EarningWithDetails extends Earning {
  appointment: {
    id: string;
    venue: "host" | "visit" | null;
    status: string;
  };
  client: {
    id: string;
    name: string;
    profileImage: string | null;
  } | null;
  cycle: {
    id: string;
    startDate: Date;
    endDate: Date;
    status: CycleStatus;
  };
}

export interface EarningCreateInput {
  professionalId: string;
  appointmentId: string;
  sessionStartTime: Date;
  sessionEndTime: Date;
  hourlyRate: number;
  platformFeePercent: number;
}

// ============================================
// PAYOUT TYPES
// ============================================

export interface Payout {
  id: string;
  professionalId: string;
  cycleId: string;
  grossTotal: number;
  platformFeeTotal: number;
  netTotal: number;
  earningsCount: number;
  status: PayoutStatus;
  stripePayoutId: string | null;
  stripeTransferId: string | null;
  processedAt: Date | null;
  failedReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PayoutWithDetails extends Payout {
  cycle: {
    id: string;
    startDate: Date;
    endDate: Date;
    status: CycleStatus;
  };
  earnings: EarningWithDetails[];
}

export interface PayoutHistoryItem {
  id: string;
  cycleId: string;
  cycleStartDate: Date;
  cycleEndDate: Date;
  grossTotal: number;
  platformFeeTotal: number;
  netTotal: number;
  earningsCount: number;
  status: PayoutStatus;
  processedAt: Date | null;
}

// ============================================
// APPOINTMENT CONFIRMATION TYPES
// ============================================

export interface AppointmentConfirmation {
  id: string;
  appointmentId: string;
  clientId: string;
  clientConfirmed: boolean | null;
  clientConfirmedAt: Date | null;
  clientReviewId: string | null;
  professionalId: string;
  professionalUserId: string;
  professionalConfirmed: boolean | null;
  professionalConfirmedAt: Date | null;
  finalStatus: ConfirmationFinalStatus;
  isDisputed: boolean;
  disputeReason: string | null;
  disputeCreatedAt: Date | null;
  disputeResolvedAt: Date | null;
  disputeResolution: DisputeResolution | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConfirmationWithDetails extends AppointmentConfirmation {
  appointment: {
    id: string;
    startTime: Date;
    endTime: Date;
    venue: "host" | "visit" | null;
    rate: number | null;
    adjustedRate: number | null;
  };
  client: {
    id: string;
    name: string;
    firstName: string | null;
    lastName: string | null;
    profileImage: string | null;
  };
  professional: {
    id: string;
    name: string;
  };
}

export interface ConfirmAppointmentInput {
  appointmentId: string;
  oderId: string; // oderId is either client or professional
  confirmed: boolean; // true = occurred, false = did not occur
  reviewData?: {
    rating: number;
    feedback: string;
  };
}

export interface ConfirmationResponse {
  confirmation: AppointmentConfirmation;
  earningCreated: boolean;
  disputeCreated: boolean;
  message: string;
}

// ============================================
// DASHBOARD / SUMMARY TYPES
// ============================================

export interface ProfessionalEarningsSummary {
  // Current cycle
  currentCycle: {
    id: string;
    startDate: Date;
    endDate: Date;
    daysRemaining: number;
    hoursUntilCutoff: number;
  };
  currentCycleEarnings: {
    gross: number;
    platformFee: number;
    net: number;
    sessionsCount: number;
    pendingConfirmations: number;
  };

  // Pending confirmations (appointments awaiting confirmation)
  pendingConfirmations: ConfirmationWithDetails[];

  // Lifetime stats
  lifetime: {
    totalGross: number;
    totalPlatformFees: number;
    totalNet: number;
    totalSessions: number;
    totalPayouts: number;
  };

  // Recent earnings (last 10)
  recentEarnings: EarningWithDetails[];

  // Upcoming payout
  upcomingPayout: {
    estimatedAmount: number;
    estimatedDate: Date;
    sessionsCount: number;
  } | null;
}

export interface WeeklyBreakdown {
  cycleId: string;
  weekNumber: number;
  startDate: Date;
  endDate: Date;
  grossTotal: number;
  platformFeeTotal: number;
  netTotal: number;
  sessionsCount: number;
  status: CycleStatus | PayoutStatus;
  payoutId: string | null;
}

export interface MonthlyBreakdown {
  year: number;
  month: number; // 1-12
  monthName: string;
  weeksCount: number;
  grossTotal: number;
  platformFeeTotal: number;
  netTotal: number;
  sessionsCount: number;
  payoutsCount: number;
}

export interface EarningsHistoryFilters {
  startDate?: Date;
  endDate?: Date;
  status?: EarningStatus;
  cycleId?: string;
  page?: number;
  limit?: number;
}

export interface PayoutHistoryFilters {
  startDate?: Date;
  endDate?: Date;
  status?: PayoutStatus;
  page?: number;
  limit?: number;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface EarningsResponse
  extends PaginatedResponse<EarningWithDetails> {
  summary: {
    totalGross: number;
    totalPlatformFees: number;
    totalNet: number;
  };
}

export interface PayoutsResponse extends PaginatedResponse<PayoutHistoryItem> {
  summary: {
    totalPaid: number;
    totalPending: number;
  };
}

// ============================================
// ADMIN TYPES
// ============================================

export interface AdminPaymentOverview {
  currentCycle: PayoutCycleWithStats;
  pendingDisputes: number;
  pendingPayouts: number;
  totalProfessionalsWithEarnings: number;
  recentPayouts: PayoutWithDetails[];
}

export interface AdminDisputeItem {
  confirmation: ConfirmationWithDetails;
  clientResponse: boolean | null;
  professionalResponse: boolean | null;
  createdAt: Date;
}

// ============================================
// CALCULATION HELPERS
// ============================================

export interface EarningCalculation {
  sessionDurationMinutes: number;
  hourlyRate: number;
  grossAmount: number;
  platformFeePercent: number;
  platformFeeAmount: number;
  netAmount: number;
}

export interface CycleDate {
  startDate: Date;
  endDate: Date;
  cutoffDate: Date;
  weekNumber: number;
  year: number;
}
