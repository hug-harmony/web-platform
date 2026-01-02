// src/app/admin/dashboard/payments/page.tsx

"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  DollarSign,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  TrendingUp,
  Users,
  Loader2,
  FileWarning,
  CreditCard,
  Ban,
  Shield,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

// ============================================
// TYPES
// ============================================

interface CycleWithStats {
  id: string;
  startDate: string;
  endDate: string;
  confirmationDeadline: string;
  status: "active" | "confirming" | "processing" | "completed" | "failed";
  totalEarnings: number;
  totalPlatformFees: number;
  earningsCount: number;
  confirmedCount: number;
  pendingCount: number;
  disputedCount: number;
  professionalCount: number;
}

interface ConfirmationStats {
  total: number;
  pending: number;
  confirmed: number;
  notOccurred: number;
  disputed: number;
}

interface FeeChargeSummary {
  totalCharges: number;
  pendingCharges: number;
  processingCharges: number;
  completedCharges: number;
  failedCharges: number;
  waivedCharges: number;
  totalAmountToCharge: number;
  totalAmountCharged: number;
  totalAmountWaived: number;
}

interface BlockedProfessional {
  id: string;
  name: string;
  blockedAt: string;
  reason: string;
  pendingFees: number;
}

interface Dispute {
  id: string;
  appointmentId: string;
  clientConfirmed: boolean | null;
  professionalConfirmed: boolean | null;
  createdAt: string;
  disputeReason: string | null;
  appointment: {
    startTime: string;
    endTime: string;
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

interface AdminDashboardData {
  currentCycle: CycleWithStats | null;
  confirmationStats: ConfirmationStats | null;
  pendingDisputes: number;
  disputes: Dispute[];
  feeChargeSummary: FeeChargeSummary;
  blockedProfessionals: BlockedProfessional[];
  blockedCount: number;
}

interface ProcessReadyData {
  readyForAutoConfirm: Array<{
    id: string;
    startDate: string;
    endDate: string;
    confirmationDeadline: string;
    status: string;
  }>;
  readyForFeeCollection: Array<{
    id: string;
    startDate: string;
    endDate: string;
    status: string;
  }>;
  autoConfirmCount: number;
  feeCollectionCount: number;
}

// ============================================
// ANIMATION VARIANTS
// ============================================

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function AdminPaymentsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  // State
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(
    null
  );
  const [processReadyData, setProcessReadyData] =
    useState<ProcessReadyData | null>(null);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [selectedBlockedPro, setSelectedBlockedPro] =
    useState<BlockedProfessional | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [waiveReason, setWaiveReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Auth check
  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login");
    } else if (authStatus === "authenticated" && !session?.user?.isAdmin) {
      toast.error("Unauthorized");
      router.push("/dashboard");
    }
  }, [authStatus, session, router]);

  // Fetch main dashboard data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/payments?view=overview", {
        credentials: "include",
      });

      if (!response.ok) throw new Error("Failed to fetch payment data");

      const data: AdminDashboardData = await response.json();
      setDashboardData(data);
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Failed to load payment data");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch cycles ready for processing
  const fetchProcessReadyData = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/payments/process", {
        credentials: "include",
      });

      if (!response.ok) throw new Error("Failed to fetch process data");

      const data: ProcessReadyData = await response.json();
      setProcessReadyData(data);
    } catch (error) {
      console.error("Fetch process ready error:", error);
    }
  }, []);

  useEffect(() => {
    if (authStatus === "authenticated" && session?.user?.isAdmin) {
      fetchData();
      fetchProcessReadyData();
    }
  }, [authStatus, session, fetchData, fetchProcessReadyData]);

  // ============================================
  // ACTION HANDLERS
  // ============================================

  // Run auto-confirm for expired confirmations
  const handleAutoConfirm = async () => {
    if (processing) return;

    setProcessing(true);
    try {
      const response = await fetch("/api/admin/payments/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "auto_confirm" }),
        credentials: "include",
      });

      if (!response.ok) throw new Error("Failed to run auto-confirm");

      const result = await response.json();
      toast.success(
        `Auto-confirm completed: ${result.autoConfirmed || 0} confirmations processed`
      );
      fetchData();
      fetchProcessReadyData();
    } catch (error) {
      console.error("Auto-confirm error:", error);
      toast.error("Failed to run auto-confirm");
    } finally {
      setProcessing(false);
    }
  };

  // Run fee collection for ready cycles
  const handleFeeCollection = async (cycleId?: string) => {
    if (processing) return;

    setProcessing(true);
    try {
      const response = await fetch("/api/admin/payments/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "full_collection", cycleId }),
        credentials: "include",
      });

      if (!response.ok) throw new Error("Failed to process fee collection");

      const result = await response.json();
      toast.success(
        `Fee collection completed: ${result.charged || 0} charges processed, ${result.totalCharged ? formatCurrency(result.totalCharged) : "$0"} collected`
      );
      fetchData();
      fetchProcessReadyData();
    } catch (error) {
      console.error("Fee collection error:", error);
      toast.error("Failed to process fee collection");
    } finally {
      setProcessing(false);
    }
  };

  // Retry failed fee charges
  const handleRetryFailed = async () => {
    if (processing) return;

    setProcessing(true);
    try {
      const response = await fetch("/api/admin/payments/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retry_failed" }),
        credentials: "include",
      });

      if (!response.ok) throw new Error("Failed to retry failed charges");

      const result = await response.json();
      toast.success(
        `Retry completed: ${result.succeeded || 0} succeeded, ${result.failed || 0} still failing`
      );
      fetchData();
    } catch (error) {
      console.error("Retry failed error:", error);
      toast.error("Failed to retry charges");
    } finally {
      setProcessing(false);
    }
  };

  // Resolve dispute
  const handleResolveDispute = async (
    disputeId: string,
    resolution: "admin_confirmed" | "admin_cancelled"
  ) => {
    setActionLoading(true);
    try {
      const response = await fetch(
        `/api/admin/payments/disputes/${disputeId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resolution }),
          credentials: "include",
        }
      );

      if (!response.ok) throw new Error("Failed to resolve dispute");

      toast.success(
        resolution === "admin_confirmed"
          ? "Dispute resolved: Appointment confirmed, earning created"
          : "Dispute resolved: Appointment cancelled, no earning"
      );
      setSelectedDispute(null);
      fetchData();
    } catch (error) {
      console.error("Dispute resolution error:", error);
      toast.error("Failed to resolve dispute");
    } finally {
      setActionLoading(false);
    }
  };

  // Unblock professional
  const handleUnblockProfessional = async (professionalId: string) => {
    setActionLoading(true);
    try {
      const response = await fetch(
        "/api/admin/payments/blocked-professionals?action=unblock",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ professionalId }),
          credentials: "include",
        }
      );

      if (!response.ok) throw new Error("Failed to unblock professional");

      toast.success("Professional unblocked successfully");
      setSelectedBlockedPro(null);
      fetchData();
    } catch (error) {
      console.error("Unblock error:", error);
      toast.error("Failed to unblock professional");
    } finally {
      setActionLoading(false);
    }
  };

  // ============================================
  // HELPERS
  // ============================================

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDateRange = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    const options: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
    };
    return `${s.toLocaleDateString("en-US", options)} - ${e.toLocaleDateString("en-US", { ...options, year: "numeric" })}`;
  };

  const getCycleStatusBadge = (status: string) => {
    const variants: Record<string, { className: string; label: string }> = {
      active: { className: "bg-green-100 text-green-800", label: "Active" },
      confirming: {
        className: "bg-yellow-100 text-yellow-800",
        label: "Confirming",
      },
      processing: {
        className: "bg-blue-100 text-blue-800",
        label: "Processing",
      },
      completed: { className: "bg-gray-100 text-gray-800", label: "Completed" },
      failed: { className: "bg-red-100 text-red-800", label: "Failed" },
    };
    const variant = variants[status] || variants.active;
    return <Badge className={variant.className}>{variant.label}</Badge>;
  };

  // ============================================
  // RENDER
  // ============================================

  if (authStatus === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#F3CFC6]" />
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-[#C4C4C4]">Failed to load data</p>
      </div>
    );
  }

  const {
    currentCycle,
    confirmationStats,
    pendingDisputes,
    disputes,
    feeChargeSummary,
    blockedProfessionals,
    blockedCount,
  } = dashboardData;

  return (
    <motion.div
      className="space-y-6 max-w-7xl mx-auto p-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-bold text-black flex items-center gap-2">
                <DollarSign className="h-6 w-6" />
                Payment Management
              </CardTitle>
              <p className="text-sm text-black/70 mt-1">
                Manage earnings, fee collection, and payment disputes
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  fetchData();
                  fetchProcessReadyData();
                }}
                className="bg-white/80"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              {processReadyData && processReadyData.autoConfirmCount > 0 && (
                <Button
                  onClick={handleAutoConfirm}
                  disabled={processing}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white"
                >
                  {processing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Clock className="h-4 w-4 mr-2" />
                  )}
                  Auto-Confirm ({processReadyData.autoConfirmCount})
                </Button>
              )}
              {processReadyData && processReadyData.feeCollectionCount > 0 && (
                <Button
                  onClick={() => handleFeeCollection()}
                  disabled={processing}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {processing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CreditCard className="h-4 w-4 mr-2" />
                  )}
                  Collect Fees ({processReadyData.feeCollectionCount})
                </Button>
              )}
              {feeChargeSummary.failedCharges > 0 && (
                <Button
                  onClick={handleRetryFailed}
                  disabled={processing}
                  variant="outline"
                  className="border-red-300 text-red-600 hover:bg-red-50"
                >
                  {processing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4 mr-2" />
                  )}
                  Retry Failed ({feeChargeSummary.failedCharges})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Stats Cards */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {/* Current Cycle */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#C4C4C4]">Current Cycle</span>
              <Calendar className="h-4 w-4 text-[#F3CFC6]" />
            </div>
            {currentCycle ? (
              <>
                <p className="text-lg font-bold text-black dark:text-white">
                  {formatDateRange(
                    currentCycle.startDate,
                    currentCycle.endDate
                  )}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {getCycleStatusBadge(currentCycle.status)}
                </div>
              </>
            ) : (
              <p className="text-[#C4C4C4]">No active cycle</p>
            )}
          </CardContent>
        </Card>

        {/* Total Earnings This Cycle */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#C4C4C4]">Cycle Earnings</span>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-black dark:text-white">
              {formatCurrency(currentCycle?.totalEarnings || 0)}
            </p>
            <p className="text-xs text-[#C4C4C4]">
              Platform fees:{" "}
              {formatCurrency(currentCycle?.totalPlatformFees || 0)}
            </p>
          </CardContent>
        </Card>

        {/* Active Professionals */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#C4C4C4]">
                Active Professionals
              </span>
              <Users className="h-4 w-4 text-[#F3CFC6]" />
            </div>
            <p className="text-2xl font-bold text-black dark:text-white">
              {currentCycle?.professionalCount || 0}
            </p>
            <p className="text-xs text-[#C4C4C4]">
              {currentCycle?.earningsCount || 0} sessions this cycle
            </p>
          </CardContent>
        </Card>

        {/* Pending Disputes */}
        <Card className={pendingDisputes > 0 ? "border-yellow-400" : ""}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#C4C4C4]">Pending Disputes</span>
              <FileWarning
                className={`h-4 w-4 ${pendingDisputes > 0 ? "text-yellow-500" : "text-[#C4C4C4]"}`}
              />
            </div>
            <p className="text-2xl font-bold text-black dark:text-white">
              {pendingDisputes}
            </p>
            <p className="text-xs text-[#C4C4C4]">Require admin review</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Secondary Stats Row */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        {/* Fee Collection Status */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-black dark:text-white">
                Fee Collection Status
              </span>
              <CreditCard className="h-4 w-4 text-[#F3CFC6]" />
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#C4C4C4]">Pending</span>
                <span className="font-medium">
                  {feeChargeSummary.pendingCharges}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#C4C4C4]">Processing</span>
                <span className="font-medium">
                  {feeChargeSummary.processingCharges}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#C4C4C4]">Completed</span>
                <span className="font-medium text-green-600">
                  {feeChargeSummary.completedCharges}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#C4C4C4]">Failed</span>
                <span className="font-medium text-red-600">
                  {feeChargeSummary.failedCharges}
                </span>
              </div>
              <div className="pt-2 border-t">
                <div className="flex justify-between">
                  <span className="font-medium">Total Collected</span>
                  <span className="font-bold text-green-600">
                    {formatCurrency(feeChargeSummary.totalAmountCharged)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Confirmation Stats */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-black dark:text-white">
                Confirmations (This Cycle)
              </span>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </div>
            {confirmationStats ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#C4C4C4]">Total</span>
                  <span className="font-medium">{confirmationStats.total}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#C4C4C4]">Pending</span>
                  <span className="font-medium text-yellow-600">
                    {confirmationStats.pending}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#C4C4C4]">Confirmed</span>
                  <span className="font-medium text-green-600">
                    {confirmationStats.confirmed}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#C4C4C4]">Disputed</span>
                  <span className="font-medium text-red-600">
                    {confirmationStats.disputed}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-[#C4C4C4] text-sm">No data available</p>
            )}
          </CardContent>
        </Card>

        {/* Blocked Professionals */}
        <Card className={blockedCount > 0 ? "border-red-400" : ""}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-black dark:text-white">
                Blocked Professionals
              </span>
              <Ban
                className={`h-4 w-4 ${blockedCount > 0 ? "text-red-500" : "text-[#C4C4C4]"}`}
              />
            </div>
            <p className="text-2xl font-bold text-black dark:text-white mb-2">
              {blockedCount}
            </p>
            {blockedCount > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-red-600">
                  Total pending fees:{" "}
                  {formatCurrency(
                    blockedProfessionals.reduce(
                      (sum, p) => sum + p.pendingFees,
                      0
                    )
                  )}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab("blocked")}
                  className="w-full mt-2 border-red-300 text-red-600 hover:bg-red-50"
                >
                  View Blocked
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Tabs Content */}
      <Card>
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="disputes">
                Disputes
                {pendingDisputes > 0 && (
                  <Badge className="ml-2 bg-yellow-500">
                    {pendingDisputes}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="fees">Fee Charges</TabsTrigger>
              <TabsTrigger value="blocked">
                Blocked
                {blockedCount > 0 && (
                  <Badge className="ml-2 bg-red-500">{blockedCount}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Disputes */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                      Recent Disputes
                      {pendingDisputes > 0 && (
                        <Badge variant="destructive">
                          {pendingDisputes} pending
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {disputes.length === 0 ? (
                      <div className="text-center py-8 text-[#C4C4C4]">
                        <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                        <p>No pending disputes</p>
                      </div>
                    ) : (
                      <ScrollArea className="h-[250px]">
                        <div className="space-y-3">
                          {disputes.map((dispute) => (
                            <div
                              key={dispute.id}
                              className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800 cursor-pointer hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors"
                              onClick={() => setSelectedDispute(dispute)}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-black dark:text-white">
                                    {dispute.client.name} &{" "}
                                    {dispute.professional.name}
                                  </p>
                                  <p className="text-xs text-[#C4C4C4]">
                                    {formatDistanceToNow(
                                      new Date(dispute.createdAt),
                                      {
                                        addSuffix: true,
                                      }
                                    )}
                                  </p>
                                </div>
                                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>

                {/* Blocked Professionals */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                      Blocked Professionals
                      {blockedCount > 0 && (
                        <Badge variant="destructive">{blockedCount}</Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {blockedProfessionals.length === 0 ? (
                      <div className="text-center py-8 text-[#C4C4C4]">
                        <Shield className="h-8 w-8 mx-auto mb-2 text-green-500" />
                        <p>No blocked professionals</p>
                      </div>
                    ) : (
                      <ScrollArea className="h-[250px]">
                        <div className="space-y-3">
                          {blockedProfessionals.map((pro) => (
                            <div
                              key={pro.id}
                              className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                              onClick={() => setSelectedBlockedPro(pro)}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-black dark:text-white">
                                    {pro.name}
                                  </p>
                                  <p className="text-xs text-[#C4C4C4]">
                                    Pending: {formatCurrency(pro.pendingFees)}
                                  </p>
                                </div>
                                <Ban className="h-5 w-5 text-red-500" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Disputes Tab */}
            <TabsContent value="disputes">
              {disputes.length === 0 ? (
                <div className="text-center py-12 text-[#C4C4C4]">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p className="text-lg">No pending disputes</p>
                  <p className="text-sm">
                    All payment confirmations are in order
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Parties</TableHead>
                      <TableHead>Appointment</TableHead>
                      <TableHead>Client Response</TableHead>
                      <TableHead>Professional Response</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence>
                      {disputes.map((dispute) => (
                        <motion.tr
                          key={dispute.id}
                          variants={itemVariants}
                          initial="hidden"
                          animate="visible"
                          className="border-b"
                        >
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {dispute.client.name}
                              </p>
                              <p className="text-sm text-[#C4C4C4]">
                                & {dispute.professional.name}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p>{formatDate(dispute.appointment.startTime)}</p>
                              <p className="text-sm text-[#C4C4C4]">
                                {formatCurrency(
                                  dispute.appointment.adjustedRate ||
                                    dispute.appointment.rate ||
                                    0
                                )}
                                /hr
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                dispute.clientConfirmed === true
                                  ? "bg-green-100 text-green-800"
                                  : dispute.clientConfirmed === false
                                    ? "bg-red-100 text-red-800"
                                    : "bg-gray-100 text-gray-800"
                              }
                            >
                              {dispute.clientConfirmed === true
                                ? "Occurred"
                                : dispute.clientConfirmed === false
                                  ? "Did Not Occur"
                                  : "No Response"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                dispute.professionalConfirmed === true
                                  ? "bg-green-100 text-green-800"
                                  : dispute.professionalConfirmed === false
                                    ? "bg-red-100 text-red-800"
                                    : "bg-gray-100 text-gray-800"
                              }
                            >
                              {dispute.professionalConfirmed === true
                                ? "Occurred"
                                : dispute.professionalConfirmed === false
                                  ? "Did Not Occur"
                                  : "No Response"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-[#C4C4C4]">
                            {formatDistanceToNow(new Date(dispute.createdAt), {
                              addSuffix: true,
                            })}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedDispute(dispute)}
                              className="border-[#F3CFC6] text-[#F3CFC6]"
                            >
                              Review
                            </Button>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            {/* Fee Charges Tab */}
            <TabsContent value="fees">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <Card className="bg-yellow-50 dark:bg-yellow-900/20">
                  <CardContent className="p-4 text-center">
                    <Clock className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
                    <p className="text-2xl font-bold">
                      {feeChargeSummary.pendingCharges}
                    </p>
                    <p className="text-sm text-[#C4C4C4]">Pending</p>
                    <p className="text-xs text-yellow-600 mt-1">
                      {formatCurrency(
                        feeChargeSummary.totalAmountToCharge -
                          feeChargeSummary.totalAmountCharged -
                          feeChargeSummary.totalAmountWaived
                      )}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-blue-50 dark:bg-blue-900/20">
                  <CardContent className="p-4 text-center">
                    <Loader2 className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                    <p className="text-2xl font-bold">
                      {feeChargeSummary.processingCharges}
                    </p>
                    <p className="text-sm text-[#C4C4C4]">Processing</p>
                  </CardContent>
                </Card>
                <Card className="bg-green-50 dark:bg-green-900/20">
                  <CardContent className="p-4 text-center">
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                    <p className="text-2xl font-bold">
                      {feeChargeSummary.completedCharges}
                    </p>
                    <p className="text-sm text-[#C4C4C4]">Completed</p>
                    <p className="text-xs text-green-600 mt-1">
                      {formatCurrency(feeChargeSummary.totalAmountCharged)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-red-50 dark:bg-red-900/20">
                  <CardContent className="p-4 text-center">
                    <XCircle className="h-8 w-8 mx-auto mb-2 text-red-500" />
                    <p className="text-2xl font-bold">
                      {feeChargeSummary.failedCharges}
                    </p>
                    <p className="text-sm text-[#C4C4C4]">Failed</p>
                    {feeChargeSummary.failedCharges > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleRetryFailed}
                        disabled={processing}
                        className="mt-2 border-red-300 text-red-600"
                      >
                        Retry All
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>

              {feeChargeSummary.waivedCharges > 0 && (
                <Card className="bg-purple-50 dark:bg-purple-900/20 mb-4">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Ban className="h-6 w-6 text-purple-500" />
                      <div>
                        <p className="font-medium text-purple-800 dark:text-purple-200">
                          Waived Charges
                        </p>
                        <p className="text-sm text-purple-600 dark:text-purple-400">
                          {feeChargeSummary.waivedCharges} charges totaling{" "}
                          {formatCurrency(feeChargeSummary.totalAmountWaived)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Blocked Professionals Tab */}
            <TabsContent value="blocked">
              {blockedProfessionals.length === 0 ? (
                <div className="text-center py-12 text-[#C4C4C4]">
                  <Shield className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p className="text-lg">No blocked professionals</p>
                  <p className="text-sm">
                    All professionals are in good standing
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Professional</TableHead>
                      <TableHead>Blocked Since</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead className="text-right">Pending Fees</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {blockedProfessionals.map((pro) => (
                      <TableRow key={pro.id}>
                        <TableCell className="font-medium">
                          {pro.name}
                        </TableCell>
                        <TableCell>
                          {formatDistanceToNow(new Date(pro.blockedAt), {
                            addSuffix: true,
                          })}
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-[#C4C4C4] max-w-[200px] truncate">
                            {pro.reason}
                          </p>
                        </TableCell>
                        <TableCell className="text-right font-medium text-red-600">
                          {formatCurrency(pro.pendingFees)}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedBlockedPro(pro)}
                            className="border-[#F3CFC6] text-[#F3CFC6]"
                          >
                            Manage
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Dispute Resolution Dialog */}
      <Dialog
        open={!!selectedDispute}
        onOpenChange={() => setSelectedDispute(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Resolve Payment Dispute
            </DialogTitle>
            <DialogDescription>
              Review the details and decide whether the appointment occurred.
            </DialogDescription>
          </DialogHeader>

          {selectedDispute && (
            <div className="space-y-4">
              {/* Appointment Details */}
              <div className="p-4 bg-[#F3CFC6]/10 rounded-lg">
                <h4 className="font-medium mb-2">Appointment Details</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-[#C4C4C4]">Client:</span>
                    <p className="font-medium">{selectedDispute.client.name}</p>
                  </div>
                  <div>
                    <span className="text-[#C4C4C4]">Professional:</span>
                    <p className="font-medium">
                      {selectedDispute.professional.name}
                    </p>
                  </div>
                  <div>
                    <span className="text-[#C4C4C4]">Date:</span>
                    <p className="font-medium">
                      {formatDate(selectedDispute.appointment.startTime)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[#C4C4C4]">Rate:</span>
                    <p className="font-medium">
                      {formatCurrency(
                        selectedDispute.appointment.adjustedRate ||
                          selectedDispute.appointment.rate ||
                          0
                      )}
                      /hr
                    </p>
                  </div>
                </div>
              </div>

              {/* Responses */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 border rounded-lg">
                  <p className="text-sm text-[#C4C4C4] mb-1">Client says:</p>
                  <Badge
                    className={
                      selectedDispute.clientConfirmed === true
                        ? "bg-green-100 text-green-800"
                        : selectedDispute.clientConfirmed === false
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-800"
                    }
                  >
                    {selectedDispute.clientConfirmed === true
                      ? "✓ Occurred"
                      : selectedDispute.clientConfirmed === false
                        ? "✗ Did Not Occur"
                        : "No Response"}
                  </Badge>
                </div>
                <div className="p-3 border rounded-lg">
                  <p className="text-sm text-[#C4C4C4] mb-1">
                    Professional says:
                  </p>
                  <Badge
                    className={
                      selectedDispute.professionalConfirmed === true
                        ? "bg-green-100 text-green-800"
                        : selectedDispute.professionalConfirmed === false
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-800"
                    }
                  >
                    {selectedDispute.professionalConfirmed === true
                      ? "✓ Occurred"
                      : selectedDispute.professionalConfirmed === false
                        ? "✗ Did Not Occur"
                        : "No Response"}
                  </Badge>
                </div>
              </div>

              {selectedDispute.disputeReason && (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <p className="text-sm text-[#C4C4C4] mb-1">Dispute Reason:</p>
                  <p className="text-sm">{selectedDispute.disputeReason}</p>
                </div>
              )}

              <p className="text-sm text-[#C4C4C4]">
                As an admin, determine whether this appointment occurred and if
                the professional&apos;s earning should be created.
              </p>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() =>
                selectedDispute &&
                handleResolveDispute(selectedDispute.id, "admin_cancelled")
              }
              disabled={actionLoading}
              className="border-red-300 text-red-600 hover:bg-red-50"
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              Did Not Occur (No Earning)
            </Button>
            <Button
              onClick={() =>
                selectedDispute &&
                handleResolveDispute(selectedDispute.id, "admin_confirmed")
              }
              disabled={actionLoading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Occurred (Create Earning)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Blocked Professional Management Dialog */}
      <Dialog
        open={!!selectedBlockedPro}
        onOpenChange={() => setSelectedBlockedPro(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-red-500" />
              Manage Blocked Professional
            </DialogTitle>
            <DialogDescription>
              Choose how to handle this blocked professional.
            </DialogDescription>
          </DialogHeader>

          {selectedBlockedPro && (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <h4 className="font-medium mb-2">{selectedBlockedPro.name}</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#C4C4C4]">Blocked Since:</span>
                    <span>{formatDate(selectedBlockedPro.blockedAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#C4C4C4]">Pending Fees:</span>
                    <span className="font-medium text-red-600">
                      {formatCurrency(selectedBlockedPro.pendingFees)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#C4C4C4]">Reason:</span>
                    <p className="mt-1">{selectedBlockedPro.reason}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="waiveReason">Waive Reason (optional)</Label>
                <Textarea
                  id="waiveReason"
                  placeholder="Enter reason for waiving fees..."
                  value={waiveReason}
                  onChange={(e) => setWaiveReason(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex-col gap-2">
            <Button
              onClick={() =>
                selectedBlockedPro &&
                handleUnblockProfessional(selectedBlockedPro.id)
              }
              disabled={actionLoading}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Unblock Professional
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                toast.info(
                  "To waive fees, go to Fee Charges tab and select the specific charge to waive"
                );
                setSelectedBlockedPro(null);
              }}
              className="w-full border-purple-300 text-purple-600 hover:bg-purple-50"
            >
              <Ban className="h-4 w-4 mr-2" />
              Waive Pending Fees
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
