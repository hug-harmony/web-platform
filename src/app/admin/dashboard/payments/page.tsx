// src/app/admin/dashboard/payments/page.tsx

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DollarSign,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Users,
  Loader2,
  CreditCard,
  Ban,
  Shield,
  Zap,
  BarChart3,
  List,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  History,
  PieChart as PieChartIcon,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Line,
  ComposedChart,
} from "recharts";

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

interface HistoricalStats {
  monthlyEarnings: Array<{
    month: string;
    grossEarnings: number;
    platformFees: number;
    sessionsCount: number;
  }>;
  weeklyEarnings: Array<{
    week: string;
    grossEarnings: number;
    platformFees: number;
    sessionsCount: number;
  }>;
  cyclePerformance: Array<{
    cycleId: string;
    startDate: string;
    endDate: string;
    status: string;
    totalEarnings: number;
    platformFees: number;
    confirmationRate: number;
    chargeSuccessRate: number;
  }>;
  feeCollectionTrend: Array<{
    month: string;
    collected: number;
    failed: number;
    waived: number;
  }>;
  confirmationTrend: Array<{
    month: string;
    confirmed: number;
    disputed: number;
    autoConfirmed: number;
  }>;
  statusDistribution: {
    earnings: {
      pending: number;
      confirmed: number;
      disputed: number;
      charged: number;
    };
    feeCharges: {
      pending: number;
      completed: number;
      failed: number;
      waived: number;
    };
  };
  topProfessionals: Array<{
    id: string;
    name: string;
    totalEarnings: number;
    platformFees: number;
    sessionsCount: number;
  }>;
  summary: {
    totalGrossEarnings: number;
    totalPlatformFees: number;
    totalSessions: number;
    averageSessionValue: number;
    confirmationRate: number;
    chargeSuccessRate: number;
    growthRate: number; // vs previous period
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
  historicalStats: HistoricalStats | null;
  allCycles: CycleWithStats[];
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
// CONSTANTS
// ============================================

const CHART_COLORS = {
  primary: "#F3CFC6",
  secondary: "#C4C4C4",
  success: "#22c55e",
  warning: "#eab308",
  danger: "#ef4444",
  info: "#3b82f6",
  purple: "#8b5cf6",
};

const STATUS_COLORS = {
  pending: "#eab308",
  confirmed: "#22c55e",
  disputed: "#ef4444",
  charged: "#3b82f6",
  completed: "#22c55e",
  failed: "#ef4444",
  waived: "#8b5cf6",
  processing: "#3b82f6",
};

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

  // View & Filter State
  const [viewMode, setViewMode] = useState<"list" | "chart">("chart");
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [dateFilter, setDateFilter] = useState<string>("last6months");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [cycleFilter, setCycleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Generate year options (last 3 years)
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 3 }, (_, i) => currentYear - i);
  }, []);

  const monthOptions = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

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
      const params = new URLSearchParams({
        view: "overview",
        includeHistory: "true",
        dateFilter,
      });

      if (dateFilter === "custom") {
        if (yearFilter !== "all") params.set("year", yearFilter);
        if (monthFilter !== "all") params.set("month", monthFilter);
      }
      if (cycleFilter !== "all") params.set("cycleId", cycleFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const response = await fetch(`/api/admin/payments?${params.toString()}`, {
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
  }, [dateFilter, yearFilter, monthFilter, cycleFilter, statusFilter]);

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

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (dateFilter !== "last6months") count++;
    if (cycleFilter !== "all") count++;
    if (statusFilter !== "all") count++;
    return count;
  }, [dateFilter, cycleFilter, statusFilter]);

  const clearAllFilters = () => {
    setDateFilter("last6months");
    setYearFilter("all");
    setMonthFilter("all");
    setCycleFilter("all");
    setStatusFilter("all");
  };

  // ============================================
  // CHART DATA TRANSFORMATIONS
  // ============================================

  const earningsChartData = useMemo(() => {
    if (!dashboardData?.historicalStats?.monthlyEarnings) return [];
    return dashboardData.historicalStats.monthlyEarnings.map((item) => ({
      name: new Date(item.month + "-01").toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      }),
      gross: item.grossEarnings,
      fees: item.platformFees,
      sessions: item.sessionsCount,
    }));
  }, [dashboardData]);

  const feeCollectionChartData = useMemo(() => {
    if (!dashboardData?.historicalStats?.feeCollectionTrend) return [];
    return dashboardData.historicalStats.feeCollectionTrend.map((item) => ({
      name: new Date(item.month + "-01").toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      }),
      collected: item.collected,
      failed: item.failed,
      waived: item.waived,
    }));
  }, [dashboardData]);

  const confirmationChartData = useMemo(() => {
    if (!dashboardData?.historicalStats?.confirmationTrend) return [];
    return dashboardData.historicalStats.confirmationTrend.map((item) => ({
      name: new Date(item.month + "-01").toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      }),
      confirmed: item.confirmed,
      disputed: item.disputed,
      autoConfirmed: item.autoConfirmed,
    }));
  }, [dashboardData]);

  const earningStatusPieData = useMemo(() => {
    if (!dashboardData?.historicalStats?.statusDistribution?.earnings)
      return [];
    const { earnings } = dashboardData.historicalStats.statusDistribution;
    return [
      {
        name: "Pending",
        value: earnings.pending,
        color: STATUS_COLORS.pending,
      },
      {
        name: "Confirmed",
        value: earnings.confirmed,
        color: STATUS_COLORS.confirmed,
      },
      {
        name: "Disputed",
        value: earnings.disputed,
        color: STATUS_COLORS.disputed,
      },
      {
        name: "Charged",
        value: earnings.charged,
        color: STATUS_COLORS.charged,
      },
    ].filter((item) => item.value > 0);
  }, [dashboardData]);

  const feeChargeStatusPieData = useMemo(() => {
    if (!dashboardData?.historicalStats?.statusDistribution?.feeCharges)
      return [];
    const { feeCharges } = dashboardData.historicalStats.statusDistribution;
    return [
      {
        name: "Pending",
        value: feeCharges.pending,
        color: STATUS_COLORS.pending,
      },
      {
        name: "Completed",
        value: feeCharges.completed,
        color: STATUS_COLORS.completed,
      },
      { name: "Failed", value: feeCharges.failed, color: STATUS_COLORS.failed },
      { name: "Waived", value: feeCharges.waived, color: STATUS_COLORS.waived },
    ].filter((item) => item.value > 0);
  }, [dashboardData]);

  const cyclePerformanceData = useMemo(() => {
    if (!dashboardData?.historicalStats?.cyclePerformance) return [];
    return dashboardData.historicalStats.cyclePerformance.map((cycle) => ({
      name: formatDateRange(cycle.startDate, cycle.endDate),
      earnings: cycle.totalEarnings,
      fees: cycle.platformFees,
      confirmRate: Math.round(cycle.confirmationRate * 100),
      chargeRate: Math.round(cycle.chargeSuccessRate * 100),
    }));
  }, [dashboardData]);

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
    historicalStats,
    allCycles,
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
            <div className="flex flex-wrap items-center gap-2">
              {/* View Toggle */}
              <div className="flex items-center gap-1 mr-2">
                <Button
                  variant={viewMode === "chart" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("chart")}
                  className="gap-2"
                >
                  <BarChart3 className="h-4 w-4" />
                  Charts
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="gap-2"
                >
                  <List className="h-4 w-4" />
                  List
                </Button>
              </div>

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

      {/* Filters Section */}
      <Card>
        <Collapsible open={filtersExpanded} onOpenChange={setFiltersExpanded}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="h-5 w-5 text-[#F3CFC6]" />
                  <CardTitle className="text-lg">Filters</CardTitle>
                  {activeFilterCount > 0 && (
                    <span className="bg-[#F3CFC6] text-black text-xs font-bold px-2 py-1 rounded-full">
                      {activeFilterCount} active
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {activeFilterCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearAllFilters();
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Clear All
                    </Button>
                  )}
                  {filtersExpanded ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Date Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Time Period
                  </label>
                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger className="border-[#F3CFC6]">
                      <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="thisMonth">This Month</SelectItem>
                      <SelectItem value="lastMonth">Last Month</SelectItem>
                      <SelectItem value="last3months">Last 3 Months</SelectItem>
                      <SelectItem value="last6months">Last 6 Months</SelectItem>
                      <SelectItem value="thisYear">This Year</SelectItem>
                      <SelectItem value="lastYear">Last Year</SelectItem>
                      <SelectItem value="allTime">All Time</SelectItem>
                      <SelectItem value="custom">Custom...</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Custom Year */}
                {dateFilter === "custom" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Year
                    </label>
                    <Select value={yearFilter} onValueChange={setYearFilter}>
                      <SelectTrigger className="border-[#F3CFC6]">
                        <SelectValue placeholder="Select Year" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Years</SelectItem>
                        {yearOptions.map((year) => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Custom Month */}
                {dateFilter === "custom" && yearFilter !== "all" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Month
                    </label>
                    <Select value={monthFilter} onValueChange={setMonthFilter}>
                      <SelectTrigger className="border-[#F3CFC6]">
                        <SelectValue placeholder="All Months" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Months</SelectItem>
                        {monthOptions.map((month) => (
                          <SelectItem key={month.value} value={month.value}>
                            {month.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Cycle Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                    <History className="h-4 w-4" />
                    Payout Cycle
                  </label>
                  <Select value={cycleFilter} onValueChange={setCycleFilter}>
                    <SelectTrigger className="border-[#F3CFC6]">
                      <SelectValue placeholder="All Cycles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Cycles</SelectItem>
                      {allCycles?.map((cycle) => (
                        <SelectItem key={cycle.id} value={cycle.id}>
                          {formatDateRange(cycle.startDate, cycle.endDate)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Cycle Status
                  </label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="border-[#F3CFC6]">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="confirming">Confirming</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Active Filters Tags */}
              {activeFilterCount > 0 && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                  {dateFilter !== "last6months" && (
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-[#F3CFC6]/20 rounded-full text-sm">
                      Period: {dateFilter}
                      <button
                        onClick={() => setDateFilter("last6months")}
                        className="hover:opacity-70"
                      >
                        ✕
                      </button>
                    </span>
                  )}
                  {cycleFilter !== "all" && (
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-[#F3CFC6]/20 rounded-full text-sm">
                      Cycle: {cycleFilter.slice(0, 8)}...
                      <button
                        onClick={() => setCycleFilter("all")}
                        className="hover:opacity-70"
                      >
                        ✕
                      </button>
                    </span>
                  )}
                  {statusFilter !== "all" && (
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-[#F3CFC6]/20 rounded-full text-sm">
                      Status: {statusFilter}
                      <button
                        onClick={() => setStatusFilter("all")}
                        className="hover:opacity-70"
                      >
                        ✕
                      </button>
                    </span>
                  )}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Summary Stats Cards */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4"
      >
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Total Gross
                </p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {formatCurrency(
                    historicalStats?.summary?.totalGrossEarnings || 0
                  )}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Platform Fees
                </p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                  {formatCurrency(
                    historicalStats?.summary?.totalPlatformFees || 0
                  )}
                </p>
              </div>
              <CreditCard className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Total Sessions
                </p>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                  {historicalStats?.summary?.totalSessions || 0}
                </p>
              </div>
              <Users className="h-8 w-8 text-purple-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900 dark:to-orange-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Confirm Rate
                </p>
                <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                  {Math.round(
                    (historicalStats?.summary?.confirmationRate || 0) * 100
                  )}
                  %
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-orange-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-900 dark:to-pink-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Growth
                </p>
                <p className="text-2xl font-bold text-pink-700 dark:text-pink-300 flex items-center gap-1">
                  {(historicalStats?.summary?.growthRate || 0) >= 0 ? (
                    <TrendingUp className="h-5 w-5" />
                  ) : (
                    <TrendingDown className="h-5 w-5" />
                  )}
                  {Math.abs(
                    Math.round(
                      (historicalStats?.summary?.growthRate || 0) * 100
                    )
                  )}
                  %
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-pink-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Charts View or List View */}
      {viewMode === "chart" ? (
        <div className="space-y-6">
          {/* Main Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Earnings Over Time */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-[#F3CFC6]" />
                  Earnings Over Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={earningsChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis
                      yAxisId="left"
                      fontSize={12}
                      tickFormatter={(value) => `$${value / 1000}k`}
                    />
                    <YAxis yAxisId="right" orientation="right" fontSize={12} />
                    <Tooltip
                      formatter={(value: number | undefined, name?: string) => {
                        if (value === undefined) return ["N/A", name ?? ""];

                        const label =
                          name === "gross"
                            ? "Gross Earnings"
                            : name === "fees"
                              ? "Platform Fees"
                              : "Sessions";

                        const formattedValue =
                          name === "sessions" ? value : formatCurrency(value);

                        return [formattedValue, label];
                      }}
                    />
                    <Legend />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="gross"
                      fill={CHART_COLORS.primary}
                      stroke={CHART_COLORS.primary}
                      fillOpacity={0.3}
                      name="Gross Earnings"
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="fees"
                      fill={CHART_COLORS.success}
                      name="Platform Fees"
                      radius={[4, 4, 0, 0]}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="sessions"
                      stroke={CHART_COLORS.info}
                      strokeWidth={2}
                      name="Sessions"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Fee Collection Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-[#F3CFC6]" />
                  Fee Collection Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={feeCollectionChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis
                      fontSize={12}
                      tickFormatter={(value) => `$${value / 1000}k`}
                    />
                    <Tooltip
                      formatter={(value: number | undefined) =>
                        value === undefined ? "N/A" : formatCurrency(value)
                      }
                    />
                    <Legend />
                    <Bar
                      dataKey="collected"
                      stackId="a"
                      fill={CHART_COLORS.success}
                      name="Collected"
                      radius={[0, 0, 0, 0]}
                    />
                    <Bar
                      dataKey="failed"
                      stackId="a"
                      fill={CHART_COLORS.danger}
                      name="Failed"
                      radius={[0, 0, 0, 0]}
                    />
                    <Bar
                      dataKey="waived"
                      stackId="a"
                      fill={CHART_COLORS.purple}
                      name="Waived"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Confirmation Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-[#F3CFC6]" />
                  Confirmation Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={confirmationChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="confirmed"
                      stackId="1"
                      stroke={CHART_COLORS.success}
                      fill={CHART_COLORS.success}
                      name="Confirmed"
                    />
                    <Area
                      type="monotone"
                      dataKey="autoConfirmed"
                      stackId="1"
                      stroke={CHART_COLORS.warning}
                      fill={CHART_COLORS.warning}
                      name="Auto-Confirmed"
                    />
                    <Area
                      type="monotone"
                      dataKey="disputed"
                      stackId="1"
                      stroke={CHART_COLORS.danger}
                      fill={CHART_COLORS.danger}
                      name="Disputed"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Cycle Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="h-5 w-5 text-[#F3CFC6]" />
                  Cycle Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={cyclePerformanceData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" fontSize={12} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      fontSize={10}
                      width={100}
                    />
                    <Tooltip
                      formatter={(value: number | undefined, name?: string) => {
                        if (value === undefined) return ["N/A", name ?? ""];

                        const label = name ?? "";

                        return [
                          label.includes("Rate")
                            ? `${value}%`
                            : formatCurrency(value),
                          label,
                        ];
                      }}
                    />

                    <Legend />
                    <Bar
                      dataKey="earnings"
                      fill={CHART_COLORS.primary}
                      name="Earnings"
                      radius={[0, 4, 4, 0]}
                    />
                    <Bar
                      dataKey="fees"
                      fill={CHART_COLORS.success}
                      name="Fees Collected"
                      radius={[0, 4, 4, 0]}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Earning Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5 text-[#F3CFC6]" />
                  Earning Status Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={earningStatusPieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                      outerRadius={100}
                      dataKey="value"
                    >
                      {earningStatusPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Fee Charge Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5 text-[#F3CFC6]" />
                  Fee Charge Status Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={feeChargeStatusPieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                      outerRadius={100}
                      dataKey="value"
                    >
                      {feeChargeStatusPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Top Professionals */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-[#F3CFC6]" />
                Top Earning Professionals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={historicalStats?.topProfessionals?.slice(0, 10) || []}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    fontSize={12}
                    tickFormatter={(value) => `$${value / 1000}k`}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    fontSize={12}
                    width={120}
                  />
                  <Tooltip
                    formatter={(value: number | undefined, name?: string) => {
                      if (value === undefined) return ["N/A", name ?? ""];

                      return [
                        formatCurrency(value),
                        name === "totalEarnings" ? "Gross" : "Fees",
                      ];
                    }}
                  />

                  <Legend />
                  <Bar
                    dataKey="totalEarnings"
                    fill={CHART_COLORS.primary}
                    name="Gross Earnings"
                    radius={[0, 4, 4, 0]}
                  />
                  <Bar
                    dataKey="platformFees"
                    fill={CHART_COLORS.success}
                    name="Platform Fees"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* List View - Keep existing tabs structure */
        <Card>
          <CardContent className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-6">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="cycles">
                  <History className="h-4 w-4 mr-1" />
                  Cycles
                </TabsTrigger>
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
                  {/* Current Cycle Card */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-[#F3CFC6]" />
                        Current Cycle
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {currentCycle ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <p className="text-lg font-bold">
                              {formatDateRange(
                                currentCycle.startDate,
                                currentCycle.endDate
                              )}
                            </p>
                            {getCycleStatusBadge(currentCycle.status)}
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-[#C4C4C4]">Gross Earnings</p>
                              <p className="font-bold text-lg">
                                {formatCurrency(currentCycle.totalEarnings)}
                              </p>
                            </div>
                            <div>
                              <p className="text-[#C4C4C4]">Platform Fees</p>
                              <p className="font-bold text-lg text-green-600">
                                {formatCurrency(currentCycle.totalPlatformFees)}
                              </p>
                            </div>
                            <div>
                              <p className="text-[#C4C4C4]">Sessions</p>
                              <p className="font-medium">
                                {currentCycle.earningsCount}
                              </p>
                            </div>
                            <div>
                              <p className="text-[#C4C4C4]">Professionals</p>
                              <p className="font-medium">
                                {currentCycle.professionalCount}
                              </p>
                            </div>
                          </div>
                          {currentCycle.confirmationDeadline && (
                            <div className="pt-2 border-t">
                              <p className="text-xs text-[#C4C4C4]">
                                Confirmation Deadline:{" "}
                                {formatDate(currentCycle.confirmationDeadline)}
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-[#C4C4C4]">No active cycle</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Confirmation Stats */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        Confirmation Stats
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {confirmationStats ? (
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-[#C4C4C4]">Total</span>
                            <span className="font-bold">
                              {confirmationStats.total}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[#C4C4C4]">Confirmed</span>
                            <span className="font-medium text-green-600">
                              {confirmationStats.confirmed}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[#C4C4C4]">Pending</span>
                            <span className="font-medium text-yellow-600">
                              {confirmationStats.pending}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[#C4C4C4]">Not Occurred</span>
                            <span className="font-medium text-gray-600">
                              {confirmationStats.notOccurred}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[#C4C4C4]">Disputed</span>
                            <span className="font-medium text-red-600">
                              {confirmationStats.disputed}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[#C4C4C4]">No data</p>
                      )}
                    </CardContent>
                  </Card>

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
                        <ScrollArea className="h-[200px]">
                          <div className="space-y-3">
                            {disputes.slice(0, 5).map((dispute) => (
                              <div
                                key={dispute.id}
                                className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 cursor-pointer hover:bg-yellow-100 transition-colors"
                                onClick={() => setSelectedDispute(dispute)}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium text-sm">
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
                                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                    </CardContent>
                  </Card>

                  {/* Fee Collection Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-[#F3CFC6]" />
                        Fee Collection
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-[#C4C4C4]">Total Charges</span>
                          <span className="font-bold">
                            {feeChargeSummary.totalCharges}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[#C4C4C4]">Completed</span>
                          <span className="font-medium text-green-600">
                            {feeChargeSummary.completedCharges} (
                            {formatCurrency(
                              feeChargeSummary.totalAmountCharged
                            )}
                            )
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[#C4C4C4]">Pending</span>
                          <span className="font-medium text-yellow-600">
                            {feeChargeSummary.pendingCharges}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[#C4C4C4]">Failed</span>
                          <span className="font-medium text-red-600">
                            {feeChargeSummary.failedCharges}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[#C4C4C4]">Waived</span>
                          <span className="font-medium text-purple-600">
                            {feeChargeSummary.waivedCharges} (
                            {formatCurrency(feeChargeSummary.totalAmountWaived)}
                            )
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Cycles History Tab */}
              <TabsContent value="cycles">
                {allCycles?.length === 0 ? (
                  <div className="text-center py-12 text-[#C4C4C4]">
                    <History className="h-12 w-12 mx-auto mb-4" />
                    <p className="text-lg">No payout cycles yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Period</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">
                          Gross Earnings
                        </TableHead>
                        <TableHead className="text-right">
                          Platform Fees
                        </TableHead>
                        <TableHead className="text-right">Sessions</TableHead>
                        <TableHead className="text-right">
                          Professionals
                        </TableHead>
                        <TableHead>Confirmation</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allCycles?.map((cycle) => (
                        <TableRow key={cycle.id}>
                          <TableCell className="font-medium">
                            {formatDateRange(cycle.startDate, cycle.endDate)}
                          </TableCell>
                          <TableCell>
                            {getCycleStatusBadge(cycle.status)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(cycle.totalEarnings)}
                          </TableCell>
                          <TableCell className="text-right text-green-600">
                            {formatCurrency(cycle.totalPlatformFees)}
                          </TableCell>
                          <TableCell className="text-right">
                            {cycle.earningsCount}
                          </TableCell>
                          <TableCell className="text-right">
                            {cycle.professionalCount}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 text-xs">
                              <span className="text-green-600">
                                {cycle.confirmedCount}✓
                              </span>
                              <span className="text-yellow-600">
                                {cycle.pendingCount}⏳
                              </span>
                              <span className="text-red-600">
                                {cycle.disputedCount}⚠
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
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
                                <p>
                                  {formatDate(dispute.appointment.startTime)}
                                </p>
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
                              {formatDistanceToNow(
                                new Date(dispute.createdAt),
                                {
                                  addSuffix: true,
                                }
                              )}
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
                  <Card className="bg-purple-50 dark:bg-purple-900/20">
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
                        <TableHead className="text-right">
                          Pending Fees
                        </TableHead>
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
      )}

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
              Did Not Occur
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
              Occurred
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Blocked Professional Dialog */}
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
                toast.info("To waive fees, go to Fee Charges tab");
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
