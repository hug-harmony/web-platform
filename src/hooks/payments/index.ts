// src/hooks/payments/index.ts

/**
 * Payment Hooks Index
 *
 * Central export for all payment-related React hooks
 */

// ============================================
// DASHBOARD
// ============================================
export {
  usePaymentDashboard,
  usePendingConfirmationsCount,
} from "./usePaymentDashboard";

// ============================================
// EARNINGS
// ============================================
export {
  useEarnings,
  useEarningsSummary,
  useWeeklyBreakdown,
  useMonthlyBreakdown,
  useEarning,
} from "./useEarnings";

// ============================================
// FEE CHARGES (replaces payouts)
// ============================================
export { useFeeCharges, usePendingFees, useFeeCharge } from "./useFeeCharges";

// ============================================
// PAYMENT METHOD
// ============================================
export {
  usePaymentMethod,
  useSetupPaymentMethod,
  useRemovePaymentMethod,
} from "./usePaymentMethod";

// ============================================
// CONFIRMATIONS
// ============================================
export {
  usePendingConfirmations,
  useConfirmation,
  useConfirmAppointment,
  useCompleteAppointment,
} from "./useConfirmation";

// ============================================
// CYCLES
// ============================================
export { useCurrentCycle, useCycles, useCycleEarnings } from "./useCycles";
export { useCycleEndBanner } from "./useCycleEndBanner";
