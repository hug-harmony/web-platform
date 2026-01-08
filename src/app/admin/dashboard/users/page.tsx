// src/app/admin/dashboard/users/page.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Users,
  Search,
  BarChart3,
  List,
  Calendar,
  MapPin,
  Activity,
  Filter,
  X,
  TrendingUp,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Link from "next/link";
import { useState, useCallback, useEffect, useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from "recharts";

interface User {
  id: string;
  name: string;
  email: string;
  profileImage: string;
  status: "active" | "suspended";
  createdAt: string;
  lastOnline: string | null;
  location: string;
  parsedLocation: {
    city: string;
    state: string;
    country: string;
  };
  activityLevel: string;
  stats: {
    appointments: number;
    posts: number;
    messages: number;
  };
  professionalApplication?: {
    status: string | null;
    professionalId: string | null;
  };
}

interface Statistics {
  totalFiltered: number;
  monthlyRegistrations: { month: string; count: number }[];
  weeklyRegistrations: { week: string; count: number }[];
  statusDistribution: { active: number; suspended: number };
  proStatusDistribution: {
    professional: number;
    pending: number;
    notApplied: number;
    rejected: number;
  };
  activityDistribution: {
    veryActive: number;
    active: number;
    moderate: number;
    inactive: number;
    dormant: number;
  };
  topLocations: { location: string; count: number }[];
}

interface FilterOptions {
  states: string[];
  cities: string[];
}

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

const ACTIVITY_COLORS = {
  veryActive: "#22c55e",
  active: "#84cc16",
  moderate: "#eab308",
  inactive: "#f97316",
  dormant: "#ef4444",
};

const STATUS_COLORS = {
  active: "#22c55e",
  suspended: "#ef4444",
};

const PRO_STATUS_COLORS = {
  professional: "#22c55e",
  pending: "#3b82f6",
  notApplied: "#9ca3af",
  rejected: "#ef4444",
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    states: [],
    cities: [],
  });
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "chart">("list");
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  // Search and basic filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [proFilter, setProFilter] = useState<string>("all");

  // New filters
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [activityFilter, setActivityFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [monthFilter, setMonthFilter] = useState<string>("all");

  // Sorting
  const [sortBy] = useState<string>("createdAt");
  const [sortOrder] = useState<"asc" | "desc">("desc");

  // Generate year options (last 5 years)
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYear - i);
  }, []);

  // Generate month options
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

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        limit: "1000",
        includeStats: "true",
      });

      if (searchTerm) params.set("search", searchTerm);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (stateFilter !== "all") params.set("state", stateFilter);
      if (cityFilter !== "all") params.set("city", cityFilter);
      if (activityFilter !== "all") params.set("activityLevel", activityFilter);
      if (dateFilter !== "all") {
        params.set("dateFilter", dateFilter);
        if (dateFilter === "custom") {
          if (yearFilter !== "all") params.set("year", yearFilter);
          if (monthFilter !== "all") params.set("month", monthFilter);
        }
      }

      const response = await fetch(`/api/admin/users?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }

      const data = await response.json();
      setUsers(data.data);
      setStatistics(data.statistics);
      setFilterOptions(data.filterOptions || { states: [], cities: [] });
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [
    searchTerm,
    statusFilter,
    stateFilter,
    cityFilter,
    activityFilter,
    dateFilter,
    yearFilter,
    monthFilter,
  ]);

  // Apply client-side filters and sorting
  useEffect(() => {
    let result = [...users];

    // Professional filter (client-side)
    if (proFilter !== "all") {
      if (proFilter === "professional") {
        result = result.filter(
          (user) => user.professionalApplication?.professionalId !== null
        );
      } else if (proFilter === "notprofessional") {
        result = result.filter(
          (user) => user.professionalApplication?.professionalId === null
        );
      } else if (proFilter === "pending") {
        result = result.filter(
          (user) =>
            user.professionalApplication?.status &&
            [
              "FORM_PENDING",
              "FORM_SUBMITTED",
              "VIDEO_PENDING",
              "QUIZ_PENDING",
              "ADMIN_REVIEW",
            ].includes(user.professionalApplication.status)
        );
      }
    }

    // Sorting
    const sortMultiplier = sortOrder === "asc" ? 1 : -1;

    result.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name) * sortMultiplier;
        case "createdAt":
          return (
            (new Date(a.createdAt).getTime() -
              new Date(b.createdAt).getTime()) *
            sortMultiplier
          );
        case "lastOnline":
          const aOnline = a.lastOnline ? new Date(a.lastOnline).getTime() : 0;
          const bOnline = b.lastOnline ? new Date(b.lastOnline).getTime() : 0;
          return (aOnline - bOnline) * sortMultiplier;
        case "status":
          return a.status.localeCompare(b.status) * sortMultiplier;
        case "activity":
          const activityOrder = {
            veryActive: 5,
            active: 4,
            moderate: 3,
            inactive: 2,
            dormant: 1,
          };
          return (
            ((activityOrder[a.activityLevel as keyof typeof activityOrder] ||
              0) -
              (activityOrder[b.activityLevel as keyof typeof activityOrder] ||
                0)) *
            sortMultiplier
          );
        default:
          return 0;
      }
    });

    setFilteredUsers(result);
  }, [users, proFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const clearAllFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setProFilter("all");
    setStateFilter("all");
    setCityFilter("all");
    setActivityFilter("all");
    setDateFilter("all");
    setYearFilter("all");
    setMonthFilter("all");
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchTerm) count++;
    if (statusFilter !== "all") count++;
    if (proFilter !== "all") count++;
    if (stateFilter !== "all") count++;
    if (cityFilter !== "all") count++;
    if (activityFilter !== "all") count++;
    if (dateFilter !== "all") count++;
    return count;
  }, [
    searchTerm,
    statusFilter,
    proFilter,
    stateFilter,
    cityFilter,
    activityFilter,
    dateFilter,
  ]);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatLastOnline = (date: string | null) => {
    if (!date) return "Never";
    const lastOnline = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - lastOnline.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getActivityBadge = (level: string) => {
    const badges: {
      [key: string]: { label: string; color: string; icon: string };
    } = {
      veryActive: {
        label: "Very Active",
        color:
          "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100",
        icon: "🟢",
      },
      active: {
        label: "Active",
        color: "bg-lime-100 dark:bg-lime-900 text-lime-800 dark:text-lime-100",
        icon: "🟡",
      },
      moderate: {
        label: "Moderate",
        color:
          "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100",
        icon: "🟠",
      },
      inactive: {
        label: "Inactive",
        color:
          "bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-100",
        icon: "🔴",
      },
      dormant: {
        label: "Dormant",
        color: "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100",
        icon: "⚫",
      },
    };
    return (
      badges[level] || {
        label: "Unknown",
        color: "bg-gray-100 text-gray-800",
        icon: "❓",
      }
    );
  };

  const getProfessionalStatus = (user: User) => {
    if (!user.professionalApplication?.status) {
      return {
        label: "Not Applied",
        color: "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100",
        icon: "📋",
      };
    }

    const status = user.professionalApplication.status;

    if (user.professionalApplication.professionalId) {
      return {
        label: "✓ Professional",
        color:
          "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100",
        icon: "✅",
      };
    }

    if (
      [
        "FORM_PENDING",
        "FORM_SUBMITTED",
        "VIDEO_PENDING",
        "QUIZ_PENDING",
        "ADMIN_REVIEW",
      ].includes(status)
    ) {
      return {
        label: "Pending Review",
        color: "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100",
        icon: "⏳",
      };
    }

    if (status === "QUIZ_FAILED") {
      return {
        label: "Quiz Failed",
        color:
          "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100",
        icon: "❌",
      };
    }

    if (status === "REJECTED") {
      return {
        label: "Rejected",
        color: "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100",
        icon: "🚫",
      };
    }

    if (status === "SUSPENDED") {
      return {
        label: "Suspended",
        color: "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100",
        icon: "🔴",
      };
    }

    return {
      label: status,
      color: "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100",
      icon: "❓",
    };
  };

  // Chart data transformations
  const statusChartData = statistics
    ? [
        { name: "Active", value: statistics.statusDistribution.active },
        { name: "Suspended", value: statistics.statusDistribution.suspended },
      ]
    : [];

  const proStatusChartData = statistics
    ? [
        {
          name: "Professional",
          value: statistics.proStatusDistribution.professional,
        },
        { name: "Pending", value: statistics.proStatusDistribution.pending },
        {
          name: "Not Applied",
          value: statistics.proStatusDistribution.notApplied,
        },
        { name: "Rejected", value: statistics.proStatusDistribution.rejected },
      ]
    : [];

  const activityChartData = statistics
    ? [
        {
          name: "Very Active",
          value: statistics.activityDistribution.veryActive,
          fill: ACTIVITY_COLORS.veryActive,
        },
        {
          name: "Active",
          value: statistics.activityDistribution.active,
          fill: ACTIVITY_COLORS.active,
        },
        {
          name: "Moderate",
          value: statistics.activityDistribution.moderate,
          fill: ACTIVITY_COLORS.moderate,
        },
        {
          name: "Inactive",
          value: statistics.activityDistribution.inactive,
          fill: ACTIVITY_COLORS.inactive,
        },
        {
          name: "Dormant",
          value: statistics.activityDistribution.dormant,
          fill: ACTIVITY_COLORS.dormant,
        },
      ]
    : [];

  const monthlyChartData = statistics
    ? statistics.monthlyRegistrations.map((item) => ({
        name: new Date(item.month + "-01").toLocaleDateString("en-US", {
          month: "short",
          year: "2-digit",
        }),
        users: item.count,
      }))
    : [];

  const weeklyChartData = statistics
    ? statistics.weeklyRegistrations.map((item) => ({
        name: new Date(item.week).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        users: item.count,
      }))
    : [];

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
              <Users className="h-6 w-6" />
              <div>
                <CardTitle className="text-2xl font-bold">
                  Hug Harmony Users
                </CardTitle>
                <p className="text-sm opacity-80">
                  Manage all registered users • Total: {users.length} • Showing:{" "}
                  {filteredUsers.length}
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
            <CardContent className="space-y-6 pt-0">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#C4C4C4]" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-[#C4C4C4] focus:ring-[#F3CFC6] dark:bg-black dark:text-white"
                  aria-label="Search users"
                />
              </div>

              {/* Filter Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Status Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Account Status
                  </label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="border-[#F3CFC6]">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Professional Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Professional Status
                  </label>
                  <Select value={proFilter} onValueChange={setProFilter}>
                    <SelectTrigger className="border-[#F3CFC6]">
                      <SelectValue placeholder="All Users" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="professional">
                        ✓ Professionals
                      </SelectItem>
                      <SelectItem value="notprofessional">
                        Not Applied
                      </SelectItem>
                      <SelectItem value="pending">Pending Review</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Activity Level Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                    <Activity className="h-4 w-4" />
                    Activity Level
                  </label>
                  <Select
                    value={activityFilter}
                    onValueChange={setActivityFilter}
                  >
                    <SelectTrigger className="border-[#F3CFC6]">
                      <SelectValue placeholder="All Activity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Activity</SelectItem>
                      <SelectItem value="veryActive">
                        🟢 Very Active (24h)
                      </SelectItem>
                      <SelectItem value="active">🟡 Active (7 days)</SelectItem>
                      <SelectItem value="moderate">
                        🟠 Moderate (30 days)
                      </SelectItem>
                      <SelectItem value="inactive">
                        🔴 Inactive (30-90 days)
                      </SelectItem>
                      <SelectItem value="dormant">
                        ⚫ Dormant (90+ days)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* State Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    State/Region
                  </label>
                  <Select value={stateFilter} onValueChange={setStateFilter}>
                    <SelectTrigger className="border-[#F3CFC6]">
                      <SelectValue placeholder="All States" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All States</SelectItem>
                      {filterOptions.states.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* City Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    City
                  </label>
                  <Select value={cityFilter} onValueChange={setCityFilter}>
                    <SelectTrigger className="border-[#F3CFC6]">
                      <SelectValue placeholder="All Cities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Cities</SelectItem>
                      {filterOptions.cities.map((city) => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Join Date
                  </label>
                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger className="border-[#F3CFC6]">
                      <SelectValue placeholder="All Time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="thisWeek">This Week</SelectItem>
                      <SelectItem value="lastWeek">Last Week</SelectItem>
                      <SelectItem value="thisMonth">This Month</SelectItem>
                      <SelectItem value="lastMonth">Last Month</SelectItem>
                      <SelectItem value="thisYear">This Year</SelectItem>
                      <SelectItem value="lastYear">Last Year</SelectItem>
                      <SelectItem value="custom">Custom...</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Custom Date - Year */}
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

                {/* Custom Date - Month */}
                {dateFilter === "custom" && yearFilter !== "all" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Month (Optional)
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
              </div>

              {/* Active Filters Tags */}
              {activeFilterCount > 0 && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                  {searchTerm && (
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-[#F3CFC6]/20 dark:bg-[#C4C4C4]/20 rounded-full text-sm text-[#F3CFC6] dark:text-white">
                      Search: {searchTerm}
                      <button
                        onClick={() => setSearchTerm("")}
                        className="hover:opacity-70"
                      >
                        ✕
                      </button>
                    </span>
                  )}
                  {statusFilter !== "all" && (
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-[#F3CFC6]/20 dark:bg-[#C4C4C4]/20 rounded-full text-sm text-[#F3CFC6] dark:text-white">
                      Status: {statusFilter}
                      <button
                        onClick={() => setStatusFilter("all")}
                        className="hover:opacity-70"
                      >
                        ✕
                      </button>
                    </span>
                  )}
                  {proFilter !== "all" && (
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-[#F3CFC6]/20 dark:bg-[#C4C4C4]/20 rounded-full text-sm text-[#F3CFC6] dark:text-white">
                      Pro Status: {proFilter}
                      <button
                        onClick={() => setProFilter("all")}
                        className="hover:opacity-70"
                      >
                        ✕
                      </button>
                    </span>
                  )}
                  {activityFilter !== "all" && (
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-[#F3CFC6]/20 dark:bg-[#C4C4C4]/20 rounded-full text-sm text-[#F3CFC6] dark:text-white">
                      Activity: {activityFilter}
                      <button
                        onClick={() => setActivityFilter("all")}
                        className="hover:opacity-70"
                      >
                        ✕
                      </button>
                    </span>
                  )}
                  {stateFilter !== "all" && (
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-[#F3CFC6]/20 dark:bg-[#C4C4C4]/20 rounded-full text-sm text-[#F3CFC6] dark:text-white">
                      State: {stateFilter}
                      <button
                        onClick={() => setStateFilter("all")}
                        className="hover:opacity-70"
                      >
                        ✕
                      </button>
                    </span>
                  )}
                  {cityFilter !== "all" && (
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-[#F3CFC6]/20 dark:bg-[#C4C4C4]/20 rounded-full text-sm text-[#F3CFC6] dark:text-white">
                      City: {cityFilter}
                      <button
                        onClick={() => setCityFilter("all")}
                        className="hover:opacity-70"
                      >
                        ✕
                      </button>
                    </span>
                  )}
                  {dateFilter !== "all" && (
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-[#F3CFC6]/20 dark:bg-[#C4C4C4]/20 rounded-full text-sm text-[#F3CFC6] dark:text-white">
                      Date:{" "}
                      {dateFilter === "custom"
                        ? `${yearFilter !== "all" ? yearFilter : ""}${monthFilter !== "all" ? `-${monthFilter}` : ""}`
                        : dateFilter}
                      <button
                        onClick={() => {
                          setDateFilter("all");
                          setYearFilter("all");
                          setMonthFilter("all");
                        }}
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

      {/* Main Content - Charts or List View */}
      {viewMode === "chart" ? (
        <div className="space-y-6">
          {/* Summary Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Total Users
                    </p>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                      {statistics?.totalFiltered || 0}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-green-500 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Active
                    </p>
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                      {statistics?.statusDistribution.active || 0}
                    </p>
                  </div>
                  <Activity className="h-8 w-8 text-blue-500 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Professionals
                    </p>
                    <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                      {statistics?.proStatusDistribution.professional || 0}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-purple-500 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900 dark:to-orange-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Very Active
                    </p>
                    <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                      {statistics?.activityDistribution.veryActive || 0}
                    </p>
                  </div>
                  <Activity className="h-8 w-8 text-orange-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Registrations */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-[#F3CFC6]" />
                  Monthly Registrations (Last 12 Months)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={monthlyChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="users"
                      stroke="#F3CFC6"
                      fill="#F3CFC6"
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Weekly Registrations */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-[#F3CFC6]" />
                  Weekly Registrations (Last 8 Weeks)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={weeklyChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="users" fill="#C4C4C4" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-[#F3CFC6]" />
                  Account Status Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`
                      }
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            index === 0
                              ? STATUS_COLORS.active
                              : STATUS_COLORS.suspended
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Professional Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-[#F3CFC6]" />
                  Professional Status Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={proStatusChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`
                      }
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {proStatusChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={Object.values(PRO_STATUS_COLORS)[index]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Activity Level Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5 text-[#F3CFC6]" />
                  User Activity Levels
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={activityChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" fontSize={12} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      fontSize={12}
                      width={80}
                    />
                    <Tooltip />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {activityChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Top Locations */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-[#F3CFC6]" />
                  Top Locations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={statistics?.topLocations || []}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" fontSize={12} />
                    <YAxis
                      dataKey="location"
                      type="category"
                      fontSize={12}
                      width={100}
                    />
                    <Tooltip />
                    <Bar dataKey="count" fill="#F3CFC6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Users List Table in Chart View */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filtered Users List</CardTitle>
              <p className="text-sm text-gray-500">
                {filteredUsers.length} users match your filters
              </p>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <table className="w-full">
                  <thead className="sticky top-0 bg-white dark:bg-gray-900">
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium">User</th>
                      <th className="text-left p-2 font-medium">Location</th>
                      <th className="text-left p-2 font-medium">Activity</th>
                      <th className="text-left p-2 font-medium">Status</th>
                      <th className="text-left p-2 font-medium">Joined</th>
                      <th className="text-left p-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => {
                      const activityBadge = getActivityBadge(
                        user.activityLevel
                      );
                      const proStatus = getProfessionalStatus(user);
                      return (
                        <tr
                          key={user.id}
                          className="border-b hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage
                                  src={
                                    user.profileImage ||
                                    "/assets/images/avatar-placeholder.png"
                                  }
                                />
                                <AvatarFallback className="bg-[#F3CFC6] text-black text-xs">
                                  {user.name[0]?.toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-sm">
                                  {user.name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {user.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="p-2 text-sm">
                            {user.parsedLocation.city &&
                            user.parsedLocation.state
                              ? `${user.parsedLocation.city}, ${user.parsedLocation.state}`
                              : user.location || "—"}
                          </td>
                          <td className="p-2">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${activityBadge.color}`}
                            >
                              {activityBadge.icon} {activityBadge.label}
                            </span>
                          </td>
                          <td className="p-2">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${proStatus.color}`}
                            >
                              {proStatus.icon} {proStatus.label}
                            </span>
                          </td>
                          <td className="p-2 text-sm text-gray-500">
                            {formatDate(user.createdAt)}
                          </td>
                          <td className="p-2">
                            <Button asChild variant="outline" size="sm">
                              <Link href={`/admin/dashboard/users/${user.id}`}>
                                View
                              </Link>
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* List View */
        <Card>
          <CardContent className="p-4">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="h-48 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"
                  />
                ))}
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-8 text-center text-[#C4C4C4]">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No users found</p>
                <p className="text-sm">Try adjusting your filters</p>
                {activeFilterCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={clearAllFilters}
                  >
                    Clear All Filters
                  </Button>
                )}
              </div>
            ) : (
              <ScrollArea className="h-[600px] pr-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <AnimatePresence>
                    {filteredUsers.map((user) => {
                      const proStatus = getProfessionalStatus(user);
                      const activityBadge = getActivityBadge(
                        user.activityLevel
                      );

                      return (
                        <motion.div
                          key={user.id}
                          variants={itemVariants}
                          initial="hidden"
                          animate="visible"
                          exit={{ opacity: 0, x: -20 }}
                          className="flex flex-col justify-between p-4 hover:bg-[#F3CFC6]/10 dark:hover:bg-[#C4C4C4]/10 transition-colors border border-[#C4C4C4] rounded"
                        >
                          {/* Top Section - User Info */}
                          <div className="space-y-3">
                            {/* Avatar and Name */}
                            <div className="flex items-start gap-3">
                              <Avatar className="h-12 w-12 border border-[#C4C4C4] flex-shrink-0">
                                <AvatarImage
                                  src={
                                    user.profileImage ||
                                    "/assets/images/avatar-placeholder.png"
                                  }
                                  alt={user.name}
                                  className="object-cover"
                                />
                                <AvatarFallback className="bg-[#F3CFC6] text-black text-xs font-bold">
                                  {user.name[0]?.toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-black dark:text-white truncate">
                                  {user.name}
                                </p>
                                <p className="text-xs text-[#C4C4C4] truncate">
                                  {user.email}
                                </p>
                                {user.location && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                                    <MapPin className="h-3 w-3" />
                                    {user.parsedLocation.city &&
                                    user.parsedLocation.state
                                      ? `${user.parsedLocation.city}, ${user.parsedLocation.state}`
                                      : user.location}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Status Badges */}
                            <div className="flex flex-wrap gap-2">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${proStatus.color}`}
                              >
                                {proStatus.icon} {proStatus.label}
                              </span>
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${activityBadge.color}`}
                              >
                                {activityBadge.icon} {activityBadge.label}
                              </span>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div className="bg-[#F3CFC6]/10 dark:bg-[#C4C4C4]/10 rounded p-2">
                                <p className="text-[#C4C4C4]">Appointments</p>
                                <p className="font-semibold text-black dark:text-white">
                                  {user.stats.appointments}
                                </p>
                              </div>
                              <div className="bg-[#F3CFC6]/10 dark:bg-[#C4C4C4]/10 rounded p-2">
                                <p className="text-[#C4C4C4]">Posts</p>
                                <p className="font-semibold text-black dark:text-white">
                                  {user.stats.posts}
                                </p>
                              </div>
                              <div className="bg-[#F3CFC6]/10 dark:bg-[#C4C4C4]/10 rounded p-2">
                                <p className="text-[#C4C4C4]">Messages</p>
                                <p className="font-semibold text-black dark:text-white">
                                  {user.stats.messages}
                                </p>
                              </div>
                            </div>

                            {/* Joined & Last Online */}
                            <div className="text-xs space-y-1 text-[#C4C4C4]">
                              <p>Joined: {formatDate(user.createdAt)}</p>
                              <p>
                                Last Online: {formatLastOnline(user.lastOnline)}
                              </p>
                            </div>
                          </div>

                          {/* Bottom Section - Status & Action */}
                          <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#C4C4C4] mt-3">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${
                                user.status === "active"
                                  ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100"
                                  : "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100"
                              }`}
                            >
                              {user.status === "active" ? "🟢" : "🔴"}{" "}
                              {user.status}
                            </span>
                            <Button
                              asChild
                              variant="outline"
                              size="sm"
                              className="border-[#F3CFC6] text-[#F3CFC6] hover:bg-[#F3CFC6]/10"
                            >
                              <Link href={`/admin/dashboard/users/${user.id}`}>
                                View
                              </Link>
                            </Button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
