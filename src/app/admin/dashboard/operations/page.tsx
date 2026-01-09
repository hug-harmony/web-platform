"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Settings2,
  Search,
  Filter,
  RefreshCw,
  Send,
  X,
  ChevronDown,
  ChevronUp,
  BarChart3,
  List,
  MessageSquare,
  AlertTriangle,
  Scale,
  Clock,
  CheckCircle2,
  Loader2,
  XCircle,
  Eye,
  MoreVertical,
  User,
  UserX,
  Calendar,
  TrendingUp,
  Mail,
  Flag,
  ArrowUpRight,
  Keyboard,
  FileText,
  Bug,
  Lightbulb,
  Megaphone,
  HelpCircle,
  MoreHorizontal,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  OperationItem,
  OperationsStats,
  OperationType,
  Priority,
  FeedbackCategory,
  OPERATION_TYPES,
  OPERATION_STATUSES,
  PRIORITIES,
  STATUS_COLORS,
  PRIORITY_COLORS,
  TYPE_COLORS,
  CATEGORY_LABELS,
} from "@/types/operations";

// Animation variants
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

// Type icons
const TYPE_ICONS: Record<OperationType, React.ReactNode> = {
  feedback: <MessageSquare className="h-4 w-4" />,
  report: <AlertTriangle className="h-4 w-4" />,
  dispute: <Scale className="h-4 w-4" />,
};

// Category icons for feedback
const CATEGORY_ICONS: Record<FeedbackCategory, React.ReactNode> = {
  general: <MessageSquare className="h-3 w-3" />,
  bug: <Bug className="h-3 w-3" />,
  feature: <Lightbulb className="h-3 w-3" />,
  complaint: <AlertCircle className="h-3 w-3" />,
  suggestion: <Megaphone className="h-3 w-3" />,
  other: <MoreHorizontal className="h-3 w-3" />,
};

// Status icons
const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock className="h-3 w-3" />,
  in_progress: <Loader2 className="h-3 w-3 animate-spin" />,
  resolved: <CheckCircle2 className="h-3 w-3" />,
  closed: <XCircle className="h-3 w-3" />,
  disputed: <Scale className="h-3 w-3" />,
  confirmed_canceled: <CheckCircle2 className="h-3 w-3" />,
  denied: <XCircle className="h-3 w-3" />,
};

// Priority icons
const PRIORITY_ICONS: Record<Priority, React.ReactNode> = {
  low: <Flag className="h-3 w-3" />,
  normal: <Flag className="h-3 w-3" />,
  high: <Flag className="h-3 w-3" />,
  urgent: <AlertTriangle className="h-3 w-3" />,
};

// Chart colors
const CHART_COLORS = {
  feedback: "#8b5cf6", // purple
  report: "#ef4444", // red
  dispute: "#f97316", // orange
};

const PIE_COLORS = ["#22c55e", "#3b82f6", "#f97316", "#ef4444"];

export default function OperationsPage() {
  // Data state
  const [items, setItems] = useState<OperationItem[]>([]);
  const [stats, setStats] = useState<OperationsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // View state
  const [viewMode, setViewMode] = useState<"list" | "chart">("list");
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  // Detail/Response dialog
  const [selectedItem, setSelectedItem] = useState<OperationItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isResponding, setIsResponding] = useState(false);
  const [responseText, setResponseText] = useState("");
  const [newStatus, setNewStatus] = useState<string>("");
  const [newPriority, setNewPriority] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  // For disputes
  const [disputeAction, setDisputeAction] = useState<string>("");

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (
        e.key === "Escape" &&
        document.activeElement === searchInputRef.current
      ) {
        setSearchTerm("");
        searchInputRef.current?.blur();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Fetch operations
  const fetchOperations = useCallback(
    async (showRefreshToast = false) => {
      try {
        if (showRefreshToast) setRefreshing(true);
        else setLoading(true);

        const params = new URLSearchParams();
        params.set("page", page.toString());
        params.set("limit", limit.toString());

        if (typeFilter !== "all") params.set("type", typeFilter);
        if (statusFilter !== "all") params.set("status", statusFilter);
        if (priorityFilter !== "all") params.set("priority", priorityFilter);
        if (searchTerm) params.set("search", searchTerm);

        // Date filters
        if (dateFilter === "custom" && startDate) {
          params.set("startDate", startDate);
          if (endDate) params.set("endDate", endDate);
        } else if (dateFilter !== "all") {
          const now = new Date();
          let start: Date;

          switch (dateFilter) {
            case "today":
              start = new Date(now.setHours(0, 0, 0, 0));
              break;
            case "yesterday":
              start = new Date(now.setDate(now.getDate() - 1));
              start.setHours(0, 0, 0, 0);
              break;
            case "thisWeek":
              start = new Date(now.setDate(now.getDate() - now.getDay()));
              start.setHours(0, 0, 0, 0);
              break;
            case "lastWeek":
              start = new Date(now.setDate(now.getDate() - now.getDay() - 7));
              start.setHours(0, 0, 0, 0);
              break;
            case "thisMonth":
              start = new Date(now.getFullYear(), now.getMonth(), 1);
              break;
            case "lastMonth":
              start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
              break;
            case "last7Days":
              start = new Date(now.setDate(now.getDate() - 7));
              break;
            case "last30Days":
              start = new Date(now.setDate(now.getDate() - 30));
              break;
            default:
              start = new Date(0);
          }

          params.set("startDate", start.toISOString().split("T")[0]);
        }

        const response = await fetch(
          `/api/admin/operations?${params.toString()}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch operations");
        }

        const data = await response.json();
        setItems(data.items || []);
        setStats(data.stats || null);
        setTotal(data.pagination?.total || 0);
        setTotalPages(data.pagination?.totalPages || 1);

        if (showRefreshToast) {
          toast.success("Operations refreshed");
        }
      } catch (err) {
        console.error("Fetch operations error:", err);
        toast.error("Failed to load operations");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      page,
      typeFilter,
      statusFilter,
      priorityFilter,
      searchTerm,
      dateFilter,
      startDate,
      endDate,
    ]
  );

  // Initial fetch
  useEffect(() => {
    fetchOperations();
  }, [fetchOperations]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [typeFilter, statusFilter, priorityFilter, searchTerm, dateFilter]);

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchTerm) count++;
    if (typeFilter !== "all") count++;
    if (statusFilter !== "all") count++;
    if (priorityFilter !== "all") count++;
    if (dateFilter !== "all") count++;
    return count;
  }, [searchTerm, typeFilter, statusFilter, priorityFilter, dateFilter]);

  // Clear filters
  const clearAllFilters = () => {
    setSearchTerm("");
    setTypeFilter("all");
    setStatusFilter("all");
    setPriorityFilter("all");
    setDateFilter("all");
    setStartDate("");
    setEndDate("");
  };

  // Open detail dialog
  const handleViewDetails = (item: OperationItem) => {
    setSelectedItem(item);
    setResponseText(item.adminResponse || "");
    setNewStatus(item.status);
    setNewPriority(item.priority);
    setDisputeAction("");
    setIsResponding(false);
    setIsDetailOpen(true);
  };

  // Submit response/update
  const handleSubmitResponse = async () => {
    if (!selectedItem) return;

    try {
      setSubmitting(true);

      const body: Record<string, unknown> = {
        type: selectedItem.type,
      };

      if (newStatus && newStatus !== selectedItem.status) {
        body.status = newStatus;
      }
      if (newPriority && newPriority !== selectedItem.priority) {
        body.priority = newPriority;
      }
      if (responseText && responseText !== selectedItem.adminResponse) {
        body.adminResponse = responseText;
      }

      // For disputes
      if (selectedItem.type === "dispute" && disputeAction) {
        body.disputeAction = disputeAction;
        body.adminNotes = responseText;
      }

      const response = await fetch(`/api/admin/operations/${selectedItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update");
      }

      toast.success(data.message || "Updated successfully");
      setIsDetailOpen(false);
      fetchOperations();
    } catch (err) {
      console.error("Submit response error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSubmitting(false);
    }
  };

  // Format date
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Format short date
  const formatShortDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  // Get user display name
  const getUserDisplayName = (
    user: {
      firstName?: string | null;
      lastName?: string | null;
      email: string;
    } | null
  ) => {
    if (!user) return "Unknown";
    if (user.firstName || user.lastName) {
      return `${user.firstName || ""} ${user.lastName || ""}`.trim();
    }
    return user.email;
  };

  // Chart data for date trend
  const chartData = useMemo(() => {
    if (!stats?.byDate) return [];
    return stats.byDate.map((d) => ({
      date: formatShortDate(d.date),
      total: d.count,
      feedback: d.byType.feedback,
      report: d.byType.report,
      dispute: d.byType.dispute,
    }));
  }, [stats]);

  // Pie chart data for types
  const typeChartData = useMemo(() => {
    if (!stats) return [];
    return [
      {
        name: "Feedback",
        value: stats.byType.feedback,
        color: CHART_COLORS.feedback,
      },
      {
        name: "Reports",
        value: stats.byType.report,
        color: CHART_COLORS.report,
      },
      {
        name: "Disputes",
        value: stats.byType.dispute,
        color: CHART_COLORS.dispute,
      },
    ].filter((d) => d.value > 0);
  }, [stats]);

  // Pie chart data for status
  const statusChartData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: "Pending", value: stats.byStatus.pending },
      { name: "In Progress", value: stats.byStatus.in_progress },
      { name: "Resolved", value: stats.byStatus.resolved },
      { name: "Closed", value: stats.byStatus.closed },
    ].filter((d) => d.value > 0);
  }, [stats]);

  // Loading skeleton
  if (loading && items.length === 0) {
    return <OperationsSkeleton />;
  }

  return (
    <motion.div
      className="space-y-6 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] text-black dark:text-white shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Settings2 className="h-6 w-6" />
              <div>
                <CardTitle className="text-2xl font-bold">
                  Operations Center
                </CardTitle>
                <p className="text-sm opacity-80">
                  Manage feedback, reports, disputes & violations • Total:{" "}
                  {total}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="gap-2"
              >
                <List className="h-4 w-4" />
                List
              </Button>
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
                variant="outline"
                size="sm"
                onClick={() => fetchOperations(true)}
                disabled={refreshing}
                className="rounded-full bg-white/80 hover:bg-white"
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* Total */}
        <Card className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Total
                </p>
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                  {stats?.total || 0}
                </p>
              </div>
              <FileText className="h-6 w-6 text-gray-400 opacity-50" />
            </div>
          </CardContent>
        </Card>

        {/* By Type */}
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-purple-600 dark:text-purple-300">
                  Feedback
                </p>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-200">
                  {stats?.byType.feedback || 0}
                </p>
              </div>
              <MessageSquare className="h-6 w-6 text-purple-400 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900 dark:to-red-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-red-600 dark:text-red-300">
                  Reports
                </p>
                <p className="text-2xl font-bold text-red-700 dark:text-red-200">
                  {stats?.byType.report || 0}
                </p>
              </div>
              <AlertTriangle className="h-6 w-6 text-red-400 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900 dark:to-orange-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-orange-600 dark:text-orange-300">
                  Disputes
                </p>
                <p className="text-2xl font-bold text-orange-700 dark:text-orange-200">
                  {stats?.byType.dispute || 0}
                </p>
              </div>
              <Scale className="h-6 w-6 text-orange-400 opacity-50" />
            </div>
          </CardContent>
        </Card>

        {/* By Status */}
        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900 dark:to-yellow-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-yellow-600 dark:text-yellow-300">
                  Pending
                </p>
                <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-200">
                  {stats?.byStatus.pending || 0}
                </p>
              </div>
              <Clock className="h-6 w-6 text-yellow-400 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-600 dark:text-blue-300">
                  In Progress
                </p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-200">
                  {stats?.byStatus.in_progress || 0}
                </p>
              </div>
              <Loader2 className="h-6 w-6 text-blue-400 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-600 dark:text-green-300">
                  Resolved
                </p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-200">
                  {stats?.byStatus.resolved || 0}
                </p>
              </div>
              <CheckCircle2 className="h-6 w-6 text-green-400 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Section */}
      <Card>
        <Collapsible open={filtersExpanded} onOpenChange={setFiltersExpanded}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="h-5 w-5 text-[#F3CFC6]" />
                  <CardTitle className="text-lg">Filters & Search</CardTitle>
                  {activeFilterCount > 0 && (
                    <Badge className="bg-[#F3CFC6] text-black text-xs font-bold px-2 py-1 rounded-full">
                      {activeFilterCount} active
                    </Badge>
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
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  ref={searchInputRef}
                  placeholder="Search by subject, message, user email... (press / to focus)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-10 border-[#C4C4C4] focus:ring-[#F3CFC6] dark:bg-black dark:text-white"
                  aria-label="Search operations"
                />
                {searchTerm ? (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center text-xs text-gray-400">
                    <Keyboard className="h-3 w-3 mr-1" />
                    <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px] font-mono">
                      /
                    </kbd>
                  </div>
                )}
              </div>

              {/* Filter Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Type Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Type
                  </Label>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="border-[#F3CFC6]">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {OPERATION_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          <div className="flex items-center gap-2">
                            {TYPE_ICONS[type]}
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Status
                  </Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="border-[#F3CFC6]">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {OPERATION_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          <div className="flex items-center gap-2">
                            {STATUS_ICONS[status]}
                            {status
                              .replace("_", " ")
                              .replace(/\b\w/g, (l) => l.toUpperCase())}
                          </div>
                        </SelectItem>
                      ))}
                      <SelectItem value="disputed">Disputed</SelectItem>
                      <SelectItem value="confirmed_canceled">
                        Confirmed Canceled
                      </SelectItem>
                      <SelectItem value="denied">Denied</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Priority Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Priority
                  </Label>
                  <Select
                    value={priorityFilter}
                    onValueChange={setPriorityFilter}
                  >
                    <SelectTrigger className="border-[#F3CFC6]">
                      <SelectValue placeholder="All Priorities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      {PRIORITIES.map((priority) => (
                        <SelectItem key={priority} value={priority}>
                          <div className="flex items-center gap-2">
                            {PRIORITY_ICONS[priority]}
                            {priority.charAt(0).toUpperCase() +
                              priority.slice(1)}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Date Range
                  </Label>
                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger className="border-[#F3CFC6]">
                      <SelectValue placeholder="All Time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="yesterday">Yesterday</SelectItem>
                      <SelectItem value="thisWeek">This Week</SelectItem>
                      <SelectItem value="lastWeek">Last Week</SelectItem>
                      <SelectItem value="thisMonth">This Month</SelectItem>
                      <SelectItem value="lastMonth">Last Month</SelectItem>
                      <SelectItem value="last7Days">Last 7 Days</SelectItem>
                      <SelectItem value="last30Days">Last 30 Days</SelectItem>
                      <SelectItem value="custom">Custom Range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Custom Date Range */}
                {dateFilter === "custom" && (
                  <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Custom Dates
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="text-sm"
                        placeholder="Start"
                      />
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="text-sm"
                        placeholder="End"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Active Filters Tags */}
              {activeFilterCount > 0 && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                  {searchTerm && (
                    <Badge
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      Search: &quot;{searchTerm}&quot;
                      <button
                        onClick={() => setSearchTerm("")}
                        className="ml-1 hover:opacity-70"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {typeFilter !== "all" && (
                    <Badge
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      Type: {typeFilter}
                      <button
                        onClick={() => setTypeFilter("all")}
                        className="ml-1 hover:opacity-70"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {statusFilter !== "all" && (
                    <Badge
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      Status: {statusFilter.replace("_", " ")}
                      <button
                        onClick={() => setStatusFilter("all")}
                        className="ml-1 hover:opacity-70"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {priorityFilter !== "all" && (
                    <Badge
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      Priority: {priorityFilter}
                      <button
                        onClick={() => setPriorityFilter("all")}
                        className="ml-1 hover:opacity-70"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {dateFilter !== "all" && (
                    <Badge
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      Date: {dateFilter}
                      <button
                        onClick={() => {
                          setDateFilter("all");
                          setStartDate("");
                          setEndDate("");
                        }}
                        className="ml-1 hover:opacity-70"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Main Content - Charts or List */}
      {viewMode === "chart" ? (
        <div className="space-y-6">
          {/* Date Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[#F3CFC6]" />
                Operations Trend (Last 30 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="feedback"
                      stackId="1"
                      stroke={CHART_COLORS.feedback}
                      fill={CHART_COLORS.feedback}
                      fillOpacity={0.6}
                      name="Feedback"
                    />
                    <Area
                      type="monotone"
                      dataKey="report"
                      stackId="1"
                      stroke={CHART_COLORS.report}
                      fill={CHART_COLORS.report}
                      fillOpacity={0.6}
                      name="Reports"
                    />
                    <Area
                      type="monotone"
                      dataKey="dispute"
                      stackId="1"
                      stroke={CHART_COLORS.dispute}
                      fill={CHART_COLORS.dispute}
                      fillOpacity={0.6}
                      name="Disputes"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-500">
                  <p>No data available for chart</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pie Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* By Type */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings2 className="h-5 w-5 text-[#F3CFC6]" />
                  Distribution by Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                {typeChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={typeChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`
                        }
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {typeChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-gray-500">
                    <p>No data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* By Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-[#F3CFC6]" />
                  Distribution by Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {statusChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={statusChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`
                        }
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {statusChartData.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={PIE_COLORS[index % PIE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-gray-500">
                    <p>No data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Priority Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Flag className="h-5 w-5 text-[#F3CFC6]" />
                Distribution by Priority
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={[
                    {
                      name: "Low",
                      value: stats?.byPriority.low || 0,
                      fill: "#94a3b8",
                    },
                    {
                      name: "Normal",
                      value: stats?.byPriority.normal || 0,
                      fill: "#3b82f6",
                    },
                    {
                      name: "High",
                      value: stats?.byPriority.high || 0,
                      fill: "#f97316",
                    },
                    {
                      name: "Urgent",
                      value: stats?.byPriority.urgent || 0,
                      fill: "#ef4444",
                    },
                  ]}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" fontSize={12} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    fontSize={12}
                    width={60}
                  />
                  <Tooltip />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {[
                      { fill: "#94a3b8" },
                      { fill: "#3b82f6" },
                      { fill: "#f97316" },
                      { fill: "#ef4444" },
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* List View */
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <List className="h-5 w-5 text-[#F3CFC6]" />
                Operations List
                <span className="text-sm font-normal text-gray-500">
                  ({items.length} of {total})
                </span>
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] pr-4">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                  <Settings2 className="h-16 w-16 mb-4 opacity-30" />
                  <p className="text-lg font-medium">No operations found</p>
                  <p className="text-sm text-gray-400 mt-1">
                    {activeFilterCount > 0
                      ? "Try adjusting your filters"
                      : "No feedback, reports, or disputes yet"}
                  </p>
                  {activeFilterCount > 0 && (
                    <Button
                      variant="outline"
                      onClick={clearAllFilters}
                      className="mt-4"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Clear Filters
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence>
                    {items.map((item) => (
                      <motion.div
                        key={`${item.type}-${item.id}`}
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        exit={{ opacity: 0, x: -20 }}
                        className={`p-4 border rounded-lg transition-all hover:shadow-md cursor-pointer ${
                          item.adminResponse
                            ? "bg-green-50/50 border-green-200 dark:bg-green-900/10 dark:border-green-800"
                            : item.priority === "urgent"
                              ? "bg-red-50/50 border-red-200 dark:bg-red-900/10 dark:border-red-800"
                              : item.priority === "high"
                                ? "bg-orange-50/50 border-orange-200 dark:bg-orange-900/10 dark:border-orange-800"
                                : "bg-white border-gray-200 dark:bg-gray-900 dark:border-gray-700"
                        }`}
                        onClick={() => handleViewDetails(item)}
                      >
                        <div className="flex items-start justify-between gap-4">
                          {/* Left side */}
                          <div className="flex-1 min-w-0">
                            {/* Badges Row */}
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              {/* Type Badge */}
                              <Badge className={TYPE_COLORS[item.type]}>
                                <span className="flex items-center gap-1">
                                  {TYPE_ICONS[item.type]}
                                  {item.type.charAt(0).toUpperCase() +
                                    item.type.slice(1)}
                                </span>
                              </Badge>

                              {/* Status Badge */}
                              <Badge
                                className={
                                  STATUS_COLORS[item.status] ||
                                  "bg-gray-100 text-gray-700"
                                }
                              >
                                <span className="flex items-center gap-1">
                                  {STATUS_ICONS[item.status] || (
                                    <HelpCircle className="h-3 w-3" />
                                  )}
                                  {item.status
                                    .replace("_", " ")
                                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                                </span>
                              </Badge>

                              {/* Priority Badge */}
                              <Badge className={PRIORITY_COLORS[item.priority]}>
                                <span className="flex items-center gap-1">
                                  {PRIORITY_ICONS[item.priority]}
                                  {item.priority.charAt(0).toUpperCase() +
                                    item.priority.slice(1)}
                                </span>
                              </Badge>

                              {/* Category for feedback */}
                              {item.type === "feedback" && item.category && (
                                <Badge variant="outline" className="text-xs">
                                  {CATEGORY_ICONS[item.category]}
                                  <span className="ml-1">
                                    {CATEGORY_LABELS[item.category]}
                                  </span>
                                </Badge>
                              )}

                              {/* Responded indicator */}
                              {item.adminResponse && (
                                <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                                  <Mail className="h-3 w-3 mr-1" />
                                  Responded
                                </Badge>
                              )}
                            </div>

                            {/* Subject */}
                            <h3 className="font-semibold text-black dark:text-white truncate">
                              {item.subject}
                            </h3>

                            {/* Description preview */}
                            {item.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                                {item.description}
                              </p>
                            )}

                            {/* Submitted by & Target */}
                            <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-gray-500">
                              {/* Submitted by */}
                              {item.submittedBy && (
                                <div className="flex items-center gap-1">
                                  <Avatar className="h-5 w-5">
                                    <AvatarImage
                                      src={
                                        item.submittedBy.profileImage ||
                                        undefined
                                      }
                                    />
                                    <AvatarFallback className="text-[8px] bg-[#F3CFC6]">
                                      {(
                                        item.submittedBy.firstName?.[0] ||
                                        item.submittedBy.email[0]
                                      ).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span>
                                    From: {getUserDisplayName(item.submittedBy)}
                                  </span>
                                </div>
                              )}

                              {/* Target user (for reports) */}
                              {item.targetUser && (
                                <div className="flex items-center gap-1 text-red-600">
                                  <UserX className="h-3 w-3" />
                                  <span>
                                    Reported:{" "}
                                    {getUserDisplayName(item.targetUser)}
                                  </span>
                                </div>
                              )}

                              {/* Target professional (for reports/disputes) */}
                              {item.targetProfessional && (
                                <div className="flex items-center gap-1 text-orange-600">
                                  <User className="h-3 w-3" />
                                  <span>
                                    Professional: {item.targetProfessional.name}
                                  </span>
                                </div>
                              )}

                              {/* Date */}
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>{formatDate(item.createdAt)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Right side - Actions */}
                          <div className="flex items-center gap-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                asChild
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleViewDetails(item)}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewDetails(item);
                                    setTimeout(
                                      () => setIsResponding(true),
                                      100
                                    );
                                  }}
                                >
                                  <Send className="h-4 w-4 mr-2" />
                                  Respond
                                </DropdownMenuItem>
                                {item.submittedBy && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild>
                                      <Link
                                        href={`/admin/dashboard/users/${item.submittedBy.id}`}
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <ExternalLink className="h-4 w-4 mr-2" />
                                        View User Profile
                                      </Link>
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {item.targetProfessional && (
                                  <DropdownMenuItem asChild>
                                    <Link
                                      href={`/admin/dashboard/professionals/${item.targetProfessional.id}`}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <ExternalLink className="h-4 w-4 mr-2" />
                                      View Professional
                                    </Link>
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <ArrowUpRight className="h-4 w-4 text-gray-400" />
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </ScrollArea>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <p className="text-sm text-gray-500">
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Detail/Response Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          {selectedItem && (
            <>
              <DialogHeader>
                {/* Badges */}
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Badge className={TYPE_COLORS[selectedItem.type]}>
                    <span className="flex items-center gap-1">
                      {TYPE_ICONS[selectedItem.type]}
                      {selectedItem.type.charAt(0).toUpperCase() +
                        selectedItem.type.slice(1)}
                    </span>
                  </Badge>
                  <Badge
                    className={
                      STATUS_COLORS[selectedItem.status] ||
                      "bg-gray-100 text-gray-700"
                    }
                  >
                    <span className="flex items-center gap-1">
                      {STATUS_ICONS[selectedItem.status]}
                      {selectedItem.status
                        .replace("_", " ")
                        .replace(/\b\w/g, (l) => l.toUpperCase())}
                    </span>
                  </Badge>
                  <Badge className={PRIORITY_COLORS[selectedItem.priority]}>
                    <span className="flex items-center gap-1">
                      {PRIORITY_ICONS[selectedItem.priority]}
                      {selectedItem.priority}
                    </span>
                  </Badge>
                </div>

                <DialogTitle className="text-xl">
                  {selectedItem.subject}
                </DialogTitle>
                <DialogDescription>
                  Submitted on {formatDate(selectedItem.createdAt)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                {/* Submitted By */}
                {selectedItem.submittedBy && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={selectedItem.submittedBy.profileImage || undefined}
                      />
                      <AvatarFallback className="bg-[#F3CFC6] text-black">
                        {(
                          selectedItem.submittedBy.firstName?.[0] ||
                          selectedItem.submittedBy.email[0]
                        ).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        {getUserDisplayName(selectedItem.submittedBy)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {selectedItem.submittedBy.email}
                      </p>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <Link
                        href={`/admin/dashboard/users/${selectedItem.submittedBy.id}`}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        View
                      </Link>
                    </Button>
                  </div>
                )}

                {/* Target User (for reports) */}
                {selectedItem.targetUser && (
                  <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={selectedItem.targetUser.profileImage || undefined}
                      />
                      <AvatarFallback className="bg-red-200 text-red-800">
                        {(
                          selectedItem.targetUser.firstName?.[0] ||
                          selectedItem.targetUser.email[0]
                        ).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium text-sm text-red-700 dark:text-red-300">
                        Reported User:{" "}
                        {getUserDisplayName(selectedItem.targetUser)}
                      </p>
                      <p className="text-xs text-red-600 dark:text-red-400">
                        {selectedItem.targetUser.email}
                      </p>
                    </div>
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="border-red-300"
                    >
                      <Link
                        href={`/admin/dashboard/users/${selectedItem.targetUser.id}`}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        View
                      </Link>
                    </Button>
                  </div>
                )}

                {/* Target Professional */}
                {selectedItem.targetProfessional && (
                  <div className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={selectedItem.targetProfessional.image || undefined}
                      />
                      <AvatarFallback className="bg-orange-200 text-orange-800">
                        {selectedItem.targetProfessional.name[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium text-sm text-orange-700 dark:text-orange-300">
                        Professional: {selectedItem.targetProfessional.name}
                      </p>
                      {selectedItem.targetProfessional.location && (
                        <p className="text-xs text-orange-600 dark:text-orange-400">
                          {selectedItem.targetProfessional.location}
                        </p>
                      )}
                    </div>
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="border-orange-300"
                    >
                      <Link
                        href={`/admin/dashboard/professionals/${selectedItem.targetProfessional.id}`}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        View
                      </Link>
                    </Button>
                  </div>
                )}

                {/* Appointment Details (for disputes) */}
                {selectedItem.type === "dispute" &&
                  selectedItem.appointmentDetails && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
                        Appointment Details
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-500">Start:</span>{" "}
                          {formatDate(
                            selectedItem.appointmentDetails.startTime
                          )}
                        </div>
                        <div>
                          <span className="text-gray-500">End:</span>{" "}
                          {formatDate(selectedItem.appointmentDetails.endTime)}
                        </div>
                        <div>
                          <span className="text-gray-500">Status:</span>{" "}
                          {selectedItem.appointmentDetails.status}
                        </div>
                        {selectedItem.appointmentDetails.payment && (
                          <div>
                            <span className="text-gray-500">Payment:</span> $
                            {selectedItem.appointmentDetails.payment.amount} (
                            {selectedItem.appointmentDetails.payment.status})
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                {/* Message/Description */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-500">
                    {selectedItem.type === "feedback"
                      ? "Feedback Message"
                      : "Details"}
                  </Label>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {selectedItem.description || "No details provided."}
                    </p>
                  </div>
                </div>

                {/* Existing Admin Response */}
                {selectedItem.adminResponse && !isResponding && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-green-600 flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      Admin Response
                    </Label>
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {selectedItem.adminResponse}
                      </p>
                      {selectedItem.adminRespondedAt && (
                        <p className="text-xs text-gray-500 mt-2">
                          Responded on{" "}
                          {formatDate(selectedItem.adminRespondedAt)}
                          {selectedItem.adminRespondedBy && (
                            <span>
                              {" "}
                              by{" "}
                              {getUserDisplayName(
                                selectedItem.adminRespondedBy
                              )}
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Response Form */}
                {isResponding && (
                  <div className="space-y-4 border-t pt-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium flex items-center gap-1">
                        <Send className="h-4 w-4 text-[#F3CFC6]" />
                        {selectedItem.adminResponse
                          ? "Update Response"
                          : "Add Response"}
                      </Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsResponding(false)}
                      >
                        Cancel
                      </Button>
                    </div>

                    {/* Status & Priority */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Status</Label>
                        <Select value={newStatus} onValueChange={setNewStatus}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {selectedItem.type === "dispute" ? (
                              <>
                                <SelectItem value="disputed">
                                  Disputed (Pending)
                                </SelectItem>
                                <SelectItem value="confirmed_canceled">
                                  Confirmed Canceled
                                </SelectItem>
                                <SelectItem value="denied">Denied</SelectItem>
                              </>
                            ) : (
                              OPERATION_STATUSES.map((status) => (
                                <SelectItem key={status} value={status}>
                                  {status
                                    .replace("_", " ")
                                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Priority</Label>
                        <Select
                          value={newPriority}
                          onValueChange={setNewPriority}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PRIORITIES.map((priority) => (
                              <SelectItem key={priority} value={priority}>
                                {priority.charAt(0).toUpperCase() +
                                  priority.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Dispute Actions */}
                    {selectedItem.type === "dispute" &&
                      selectedItem.status === "disputed" && (
                        <div className="space-y-2">
                          <Label>Dispute Resolution</Label>
                          <Select
                            value={disputeAction}
                            onValueChange={setDisputeAction}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select action..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="confirm_cancel">
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                                  Confirm Cancel (Refund & Restore Slot)
                                </div>
                              </SelectItem>
                              <SelectItem value="deny">
                                <div className="flex items-center gap-2">
                                  <XCircle className="h-4 w-4 text-red-600" />
                                  Deny Dispute (Mark as Completed)
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                    {/* Response Text */}
                    <div className="space-y-2">
                      <Label>
                        {selectedItem.type === "dispute"
                          ? "Admin Notes"
                          : "Response Message"}
                      </Label>
                      <Textarea
                        value={responseText}
                        onChange={(e) => setResponseText(e.target.value)}
                        placeholder="Enter your response or notes..."
                        className="min-h-[100px]"
                        maxLength={5000}
                      />
                      <p className="text-xs text-gray-500 text-right">
                        {responseText.length}/5000
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="mt-6 gap-2">
                {!isResponding ? (
                  <>
                    <DialogClose asChild>
                      <Button variant="outline">Close</Button>
                    </DialogClose>
                    <Button
                      onClick={() => setIsResponding(true)}
                      className="bg-[#F3CFC6] hover:bg-[#e9bfb5] text-black"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {selectedItem.adminResponse
                        ? "Update Response"
                        : "Respond"}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setIsResponding(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSubmitResponse}
                      disabled={submitting}
                      className="bg-[#F3CFC6] hover:bg-[#e9bfb5] text-black"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

// Skeleton Loader
function OperationsSkeleton() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-8 w-56 bg-white/50" />
              <Skeleton className="h-4 w-72 mt-2 bg-white/50" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-20 bg-white/50" />
              <Skeleton className="h-9 w-20 bg-white/50" />
              <Skeleton className="h-9 w-24 rounded-full bg-white/50" />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-16 mb-2" />
              <Skeleton className="h-8 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
      </Card>

      {/* List */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
