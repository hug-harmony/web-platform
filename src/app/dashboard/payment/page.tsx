// src/app/dashboard/payment/page.tsx

"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePaymentDashboard } from "@/hooks/payments";

// Components
import { EarningsSummaryCard } from "@/components/payments/EarningsSummaryCard";
import { CurrentCycleCard } from "@/components/payments/CurrentCycleCard";
import { PendingConfirmationsCard } from "@/components/payments/PendingConfirmationsCard";
import { UpcomingEarningsCard } from "@/components/payments/UpcomingEarningsCard";
import { PendingFeesCard } from "@/components/payments/PendingFeesCard";
import { EarningsTable } from "@/components/payments/EarningsTable";
import { FeeChargeHistoryTable } from "@/components/payments/FeeChargeHistoryTable";
import { WeeklyBreakdownChart } from "@/components/payments/WeeklyBreakdownChart";
import { MonthlyBreakdownTable } from "@/components/payments/MonthlyBreakdownTable";
import { PaymentPageSkeleton } from "@/components/payments/PaymentPageSkeleton";
import { EmptyEarningsState } from "@/components/payments/EmptyEarningsState";
import { ConfirmationDialog } from "@/components/payments/ConfirmationDialog";
import { PaymentMethodCard } from "@/components/payments/PaymentMethodCard";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
};

export default function PaymentsPage() {
  const { status: authStatus } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"overview" | "earnings" | "fees">(
    "overview"
  );
  const [selectedConfirmation, setSelectedConfirmation] = useState<
    string | null
  >(null);

  const {
    data,
    isLoading,
    error,
    refetch,
    hasEarnings,
    hasPendingConfirmations,
    hasPendingFees,
    hasPaymentMethod,
    isPaymentBlocked,
    currentCycleProgress,
    formattedCycleDateRange,
  } = usePaymentDashboard();

  // Redirect if not authenticated
  if (authStatus === "unauthenticated") {
    router.push("/login");
    return null;
  }

  // Loading state
  if (authStatus === "loading" || isLoading) {
    return <PaymentPageSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <div className="p-4 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center"
        >
          <h2 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
            Unable to load payment data
          </h2>
          <p className="text-red-600 dark:text-red-300 mb-4">{error}</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-100 rounded-md hover:bg-red-200 dark:hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </motion.div>
      </div>
    );
  }

  // Not a professional
  if (!data) {
    return (
      <div className="p-4 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#F3CFC6]/20 dark:bg-[#C4C4C4]/10 border border-[#F3CFC6] dark:border-[#C4C4C4]/30 rounded-lg p-8 text-center"
        >
          <h2 className="text-xl font-semibold text-black dark:text-white mb-2">
            Professional Account Required
          </h2>
          <p className="text-[#C4C4C4] dark:text-[#C4C4C4] mb-4">
            You need to be an approved professional to view earnings and payment
            information.
          </p>
          <button
            onClick={() =>
              router.push("/dashboard/edit-profile/professional-application")
            }
            className="px-6 py-2 bg-[#F3CFC6] text-black rounded-md hover:bg-[#F3CFC6]/80 transition-colors"
          >
            Apply to Become a Professional
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      className="p-4 space-y-6 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-black dark:text-white">
              Earnings & Fees
            </h1>
            <p className="text-[#C4C4C4] dark:text-[#C4C4C4] text-sm mt-1">
              Track your earnings, confirmations, and platform fee history
            </p>
          </div>
          {data.currentCycle && (
            <div className="text-right">
              <p className="text-sm text-[#C4C4C4]">Current Cycle</p>
              <p className="text-black dark:text-white font-medium">
                {formattedCycleDateRange}
              </p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Payment Blocked Alert */}
      {isPaymentBlocked && (
        <motion.div variants={itemVariants}>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-200 dark:bg-red-800 rounded-full shrink-0">
                <svg
                  className="w-5 h-5 text-red-700 dark:text-red-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-red-800 dark:text-red-200">
                  Account Restricted
                </p>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  {data.paymentMethod?.blockedReason ||
                    "Your account has been restricted due to payment issues. Please update your payment method."}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Pending Confirmations Alert */}
      {hasPendingConfirmations && (
        <motion.div variants={itemVariants}>
          <PendingConfirmationsCard
            confirmations={data.pendingConfirmations}
            onConfirmClick={(appointmentId) =>
              setSelectedConfirmation(appointmentId)
            }
          />
        </motion.div>
      )}

      {/* Summary Cards */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <EarningsSummaryCard
          title="This Cycle"
          gross={data.currentCycleEarnings?.gross ?? 0}
          net={data.currentCycleEarnings?.net ?? 0}
          platformFee={data.currentCycleEarnings?.platformFee ?? 0}
          sessions={data.currentCycleEarnings?.sessionsCount ?? 0}
          pending={data.currentCycleEarnings?.pendingConfirmations ?? 0}
          variant="current"
        />
        <EarningsSummaryCard
          title="Lifetime Earnings"
          gross={data.lifetime?.totalGross ?? 0}
          net={data.lifetime?.totalNet ?? 0}
          platformFee={data.lifetime?.totalPlatformFees ?? 0}
          sessions={data.lifetime?.totalSessions ?? 0}
          variant="lifetime"
        />
        <CurrentCycleCard
          daysRemaining={data.currentCycle?.daysRemaining ?? 0}
          hoursUntilDeadline={data.currentCycle?.hoursUntilDeadline ?? 0}
          hoursUntilCutoff={data.currentCycle?.hoursUntilDeadline ?? 0}
          progress={currentCycleProgress}
          isProcessing={data.currentCycle?.isProcessing ?? false}
        />
        {hasPendingFees ? (
          <PendingFeesCard
            amount={data.pendingFees?.amount ?? 0}
            cycleCount={data.pendingFees?.cycleCount ?? 0}
          />
        ) : (
          <UpcomingEarningsCard
            estimatedNet={data.upcomingEarnings?.estimatedNet ?? 0}
            estimatedFee={data.upcomingEarnings?.estimatedPlatformFee ?? 0}
            sessions={data.upcomingEarnings?.sessionsCount ?? 0}
            pendingConfirmations={
              data.upcomingEarnings?.pendingConfirmations ?? 0
            }
          />
        )}
      </motion.div>

      {/* Payment Method Card */}
      <motion.div variants={itemVariants}>
        <PaymentMethodCard
          hasPaymentMethod={hasPaymentMethod}
          cardLast4={data.paymentMethod?.cardLast4}
          cardBrand={data.paymentMethod?.cardBrand}
          cardExpiryMonth={data.paymentMethod?.cardExpiryMonth}
          cardExpiryYear={data.paymentMethod?.cardExpiryYear}
          addedAt={data.paymentMethod?.addedAt}
          isBlocked={isPaymentBlocked}
          blockedReason={data.paymentMethod?.blockedReason}
          onUpdate={refetch}
        />
      </motion.div>

      {/* Main Content Tabs */}
      <motion.div variants={itemVariants}>
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as typeof activeTab)}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3 bg-[#F3CFC6]/20 dark:bg-[#C4C4C4]/10">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-[#F3CFC6] data-[state=active]:text-black"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="earnings"
              className="data-[state=active]:bg-[#F3CFC6] data-[state=active]:text-black"
            >
              Earnings
            </TabsTrigger>
            <TabsTrigger
              value="fees"
              className="data-[state=active]:bg-[#F3CFC6] data-[state=active]:text-black"
            >
              Fee History
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-6 space-y-6">
            {!hasEarnings ? (
              <EmptyEarningsState />
            ) : (
              <>
                {/* Weekly Chart */}
                <WeeklyBreakdownChart data={data.weeklyBreakdown} />

                {/* Monthly Breakdown (if applicable) */}
                {data.showMonthlyView && data.monthlyBreakdown && (
                  <MonthlyBreakdownTable data={data.monthlyBreakdown} />
                )}

                {/* Recent Earnings */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-black dark:text-white">
                      Recent Sessions
                    </h3>
                    <button
                      onClick={() => setActiveTab("earnings")}
                      className="text-sm text-[#F3CFC6] hover:underline"
                    >
                      View All
                    </button>
                  </div>
                  <EarningsTable
                    earnings={data.recentEarnings}
                    compact
                    showPagination={false}
                  />
                </div>
              </>
            )}
          </TabsContent>

          {/* Earnings Tab */}
          <TabsContent value="earnings" className="mt-6">
            <EarningsTable showFilters showPagination />
          </TabsContent>

          {/* Fee History Tab */}
          <TabsContent value="fees" className="mt-6">
            <FeeChargeHistoryTable />
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        appointmentId={selectedConfirmation}
        open={!!selectedConfirmation}
        onClose={() => setSelectedConfirmation(null)}
        onSuccess={() => {
          setSelectedConfirmation(null);
          refetch();
        }}
      />
    </motion.div>
  );
}
