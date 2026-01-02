// src/types/payments.ts

// ============================================
// EARNING TYPES
// ============================================

export type EarningStatus =
  | "pending" // Awaiting confirmation
  | "confirmed" // Both parties confirmed
  | "not_occurred" // Both said it didn't happen
  | "disputed" // Disagreement, awaiting admin
  | "charged" // Platform fee collected
  | "waived"; // Fee waived by admin

export interface Earning {
  id: string;
  professionalId: string;
  appointmentId: string;
  cycleId: string;
  grossAmount: number;
  platformFeePercent: number;
  platformFeeAmount: number;
  netAmount: number; // Added: grossAmount - platformFeeAmount
  sessionDurationMinutes: number;
  hourlyRate: number;
  sessionStartTime: Date;
  sessionEndTime: Date;
  status: EarningStatus;
  feeChargeId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EarningWithDetails extends Earning {
  appointment: {
    id: string;
    venue: string | null;
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

export interface EarningCalculation {
  sessionDurationMinutes: number;
  hourlyRate: number;
  grossAmount: number;
  platformFeePercent: number;
  platformFeeAmount: number;
  netAmount: number;
}

export interface EarningsHistoryFilters {
  startDate?: Date;
  endDate?: Date;
  status?: EarningStatus;
  cycleId?: string;
  page?: number;
  limit?: number;
}

export interface EarningsResponse {
  data: EarningWithDetails[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  summary: {
    totalGross: number;
    totalNet: number;
    totalPlatformFees: number;
    confirmedCount: number;
    pendingCount: number;
  };
}

// ============================================
// CYCLE TYPES
// ============================================

export type CycleStatus =
  | "active" // Current cycle, accepting confirmations
  | "confirming" // Running auto-confirm for unconfirmed
  | "processing" // Collecting fees
  | "completed" // All done
  | "failed"; // Something went wrong

export interface PayoutCycle {
  id: string;
  startDate: Date;
  endDate: Date;
  confirmationDeadline: Date | null;
  status: CycleStatus;
  autoConfirmRanAt: Date | null;
  feeCollectionRanAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CycleWithStats extends PayoutCycle {
  totalEarnings: number;
  totalPlatformFees: number;
  earningsCount: number;
  confirmedCount: number;
  pendingCount: number;
  disputedCount: number;
  professionalCount: number;
}

export interface CycleInfo {
  current: PayoutCycle;
  daysRemaining: number;
  hoursUntilDeadline: number;
  isProcessing: boolean;
}

// ============================================
// FEE CHARGE TYPES (Platform fee collection from professionals)
// ============================================

export type FeeChargeStatus =
  | "pending" // Not yet attempted
  | "processing" // Charge in progress
  | "completed" // Successfully charged
  | "failed" // Charge failed
  | "partially_paid" // Partial payment received
  | "waived"; // Admin waived the fee

export interface FeeCharge {
  id: string;
  professionalId: string;
  cycleId: string;
  totalGrossEarnings: number;
  platformFeePercent: number;
  amountToCharge: number;
  earningsCount: number;
  status: FeeChargeStatus;
  stripePaymentIntentId: string | null;
  stripeChargeId: string | null;
  attemptCount: number;
  lastAttemptAt: Date | null;
  nextRetryAt: Date | null;
  failureCode: string | null;
  failureMessage: string | null;
  chargedAt: Date | null;
  chargedAmount: number | null;
  waivedAt: Date | null;
  waivedBy: string | null;
  waivedReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FeeChargeWithDetails extends FeeCharge {
  professional: {
    id: string;
    name: string;
    cardLast4: string | null;
    cardBrand: string | null;
    hasValidPaymentMethod: boolean;
  };
  cycle: {
    id: string;
    startDate: Date;
    endDate: Date;
    status: CycleStatus;
  };
  earnings: Earning[];
}

export interface FeeChargeHistoryFilters {
  startDate?: Date;
  endDate?: Date;
  status?: FeeChargeStatus;
  page?: number;
  limit?: number;
}

export interface FeeChargesResponse {
  data: FeeChargeWithDetails[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  summary: {
    totalCharged: number;
    totalPending: number;
    totalFailed: number;
    totalWaived: number;
  };
}

// ============================================
// CONFIRMATION TYPES
// ============================================

export type ConfirmationFinalStatus =
  | "pending" // Waiting for responses
  | "confirmed" // Both confirmed it occurred
  | "not_occurred" // Both confirmed it didn't
  | "disputed" // Disagreement
  | "auto_not_occurred"; // Auto-resolved as not occurred

export type DisputeResolution = "admin_confirmed" | "admin_cancelled";

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
  autoResolvedAt: Date | null;
  autoResolveReason: string | null;
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
    venue: string | null;
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
  confirmed: boolean;
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
// PROFESSIONAL PAYMENT METHOD TYPES
// ============================================

export interface ProfessionalPaymentMethod {
  hasPaymentMethod: boolean;
  cardLast4: string | null;
  cardBrand: string | null;
  cardExpiryMonth: number | null;
  cardExpiryYear: number | null;
  addedAt: Date | null;
  isBlocked: boolean;
  blockedReason: string | null;
}

export interface SetupPaymentMethodResponse {
  clientSecret: string;
  setupIntentId: string;
}

// ============================================
// DASHBOARD TYPES
// ============================================

export interface ProfessionalPaymentDashboard {
  currentCycle: {
    id: string;
    startDate: Date;
    endDate: Date;
    confirmationDeadline: Date | null;
    daysRemaining: number;
    hoursUntilDeadline: number;
    isProcessing: boolean;
  };
  currentCycleEarnings: {
    gross: number;
    net: number;
    platformFee: number;
    platformFeePercent: number;
    sessionsCount: number;
    pendingConfirmations: number;
    confirmedCount: number;
  };
  lifetime: {
    totalGross: number;
    totalNet: number;
    totalPlatformFees: number;
    totalSessions: number;
    totalCharged: number;
  };
  paymentMethod: ProfessionalPaymentMethod;
  pendingFees: {
    amount: number;
    cycleCount: number;
  };
  recentCharges: FeeChargeWithDetails[];
  pendingConfirmations: (ConfirmationWithDetails & {
    role: "client" | "professional";
  })[];
  pendingConfirmationsCount: number;
  recentEarnings: EarningWithDetails[];
  weeklyBreakdown: WeeklyBreakdown[];
  monthlyBreakdown: MonthlyBreakdown[] | null;
  showMonthlyView: boolean;
}

export interface AdminPaymentDashboard {
  currentCycle: CycleWithStats;
  pendingConfirmations: number;
  disputedConfirmations: number;
  feeCollection: {
    totalToCollect: number;
    totalCollected: number;
    totalFailed: number;
    totalWaived: number;
    professionalsWithFailedCharges: number;
  };
  blockedProfessionals: number;
}

// ============================================
// WEEKLY/MONTHLY BREAKDOWN TYPES
// ============================================

export interface WeeklyBreakdown {
  cycleId: string;
  startDate: Date;
  endDate: Date;
  grossTotal: number;
  netTotal: number;
  platformFeeTotal: number;
  sessionsCount: number;
  status: CycleStatus;
  feeChargeStatus: FeeChargeStatus | null;
  feeChargeId: string | null;

  weeksCount?: number; // For monthly breakdown (optional if not always present)
  weekNumber?: number; // For chart X-axis labeling
}

export interface MonthlyBreakdown {
  year: number;
  month: number;
  monthName: string;
  cyclesCount: number;
  grossTotal: number;
  netTotal: number;
  platformFeeTotal: number;
  sessionsCount: number;
  chargedTotal: number;
}

// ============================================
// UPCOMING EARNINGS (replacing "payout" concept)
// ============================================

export interface UpcomingEarnings {
  estimatedNet: number;
  estimatedPlatformFee: number;
  sessionsCount: number;
  pendingConfirmations: number;
  estimatedDate: Date | null;
}
