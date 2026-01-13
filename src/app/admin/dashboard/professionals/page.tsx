// src/app/admin/dashboard/professionals/page.tsx
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
  Briefcase,
  Search,
  BarChart3,
  List,
  Calendar,
  MapPin,
  Star,
  Filter,
  X,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  DollarSign,
  CreditCard,
  Users,
  MessageSquare,
  Eye,
  Video,
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

interface Professional {
  id: string;
  name: string;
  image: string | null;
  rating: number | null;
  reviewCount: number;
  rate: number | null;
  offersVideo: boolean;
  videoRate: number | null;
  biography: string | null;
  companyCutPercentage: number | null;
  venue: "host" | "visit" | "both" | null;
  createdAt: string;
  location: string | null;
  parsedLocation: {
    city: string;
    state: string;
    country: string;
  };
  paymentStatus: {
    hasValidPaymentMethod: boolean;
    isBlocked: boolean;
    blockReason: string | null;
    cardLast4: string | null;
    cardBrand: string | null;
    acceptanceMethods: string[];
  };
  linkedUser: {
    id: string;
    email: string;
    name: string | null;
    lastOnline: string | null;
    profileImage: string | null;
  } | null;
  applicationStatus: string | null;
  stats: {
    totalAppointments: number;
    appointmentsByStatus: Record<string, number>;
    totalReviews: number;
    profileVisits: number;
    totalEarnings: number;
    platformFees: number;
    earningsCount: number;
    availabilitySlots: number;
  };
}

interface Statistics {
  totalFiltered: number;
  monthlyRegistrations: { month: string; count: number }[];
  weeklyRegistrations: { week: string; count: number }[];
  venueDistribution: { host: number; visit: number; both: number };
  ratingDistribution: {
    excellent: number;
    good: number;
    average: number;
    poor: number;
    noRating: number;
  };
  paymentStatusDistribution: {
    valid: number;
    invalid: number;
    blocked: number;
  };
  rateDistribution: { range: string; count: number }[];
  reviewStats: {
    withReviews: number;
    withoutReviews: number;
    totalReviews: number;
    averageReviewsPerPro: number;
  };
  topLocations: { location: string; count: number }[];
  topByReviews: { id: string; reviewCount: number; rating: number | null }[];
  earningsStats: {
    totalGross: number;
    totalPlatformFees: number;
    averageEarning: number;
    totalTransactions: number;
  };
}

interface FilterOptions {
  states: string[];
  cities: string[];
  rateRange: {
    min: number;
    max: number;
  };
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

const VENUE_COLORS = {
  host: "#22c55e",
  visit: "#3b82f6",
  both: "#8b5cf6",
};

const RATING_COLORS = {
  excellent: "#22c55e",
  good: "#84cc16",
  average: "#eab308",
  poor: "#f97316",
  noRating: "#9ca3af",
};

const PAYMENT_COLORS = {
  valid: "#22c55e",
  invalid: "#f97316",
  blocked: "#ef4444",
};

export default function ProfessionalsPage() {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [filteredProfessionals, setFilteredProfessionals] = useState<
    Professional[]
  >([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    states: [],
    cities: [],
    rateRange: { min: 0, max: 500 },
  });
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "chart">("list");
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  // Search and filters
  const [searchTerm, setSearchTerm] = useState("");
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [venueFilter, setVenueFilter] = useState<string>("all");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [rateMin, setRateMin] = useState<string>("");
  const [rateMax, setRateMax] = useState<string>("");

  // Sorting
  const [sortBy] = useState<string>("createdAt");
  const [sortOrder] = useState<"asc" | "desc">("desc");

  // Year options
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYear - i);
  }, []);

  // Month options
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

  const fetchProfessionals = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        limit: "1000",
        includeStats: "true",
      });

      if (searchTerm) params.set("search", searchTerm);
      if (stateFilter !== "all") params.set("state", stateFilter);
      if (cityFilter !== "all") params.set("city", cityFilter);
      if (venueFilter !== "all") params.set("venueType", venueFilter);
      if (ratingFilter !== "all") params.set("ratingFilter", ratingFilter);
      if (paymentFilter !== "all") params.set("paymentStatus", paymentFilter);
      if (rateMin) params.set("rateMin", rateMin);
      if (rateMax) params.set("rateMax", rateMax);
      if (dateFilter !== "all") {
        params.set("dateFilter", dateFilter);
        if (dateFilter === "custom") {
          if (yearFilter !== "all") params.set("year", yearFilter);
          if (monthFilter !== "all") params.set("month", monthFilter);
        }
      }

      const response = await fetch(
        `/api/admin/professionals?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch professionals");
      }

      const data = await response.json();
      setProfessionals(data.data);
      setStatistics(data.statistics);
      setFilterOptions(
        data.filterOptions || {
          states: [],
          cities: [],
          rateRange: { min: 0, max: 500 },
        }
      );
    } catch (error) {
      console.error("Error fetching professionals:", error);
      toast.error("Failed to load professionals");
    } finally {
      setLoading(false);
    }
  }, [
    searchTerm,
    stateFilter,
    cityFilter,
    venueFilter,
    ratingFilter,
    paymentFilter,
    rateMin,
    rateMax,
    dateFilter,
    yearFilter,
    monthFilter,
  ]);

  // Apply client-side sorting
  useEffect(() => {
    const result = [...professionals];

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
        case "rating":
          const aRating = a.rating ?? 0;
          const bRating = b.rating ?? 0;
          return (aRating - bRating) * sortMultiplier;
        case "rate":
          const aRate = a.rate ?? 0;
          const bRate = b.rate ?? 0;
          return (aRate - bRate) * sortMultiplier;
        case "reviews":
          return (a.reviewCount - b.reviewCount) * sortMultiplier;
        case "earnings":
          return (
            (a.stats.totalEarnings - b.stats.totalEarnings) * sortMultiplier
          );
        default:
          return 0;
      }
    });

    setFilteredProfessionals(result);
  }, [professionals, sortBy, sortOrder]);

  useEffect(() => {
    fetchProfessionals();
  }, [fetchProfessionals]);

  const clearAllFilters = () => {
    setSearchTerm("");
    setStateFilter("all");
    setCityFilter("all");
    setVenueFilter("all");
    setRatingFilter("all");
    setPaymentFilter("all");
    setDateFilter("all");
    setYearFilter("all");
    setMonthFilter("all");
    setRateMin("");
    setRateMax("");
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchTerm) count++;
    if (stateFilter !== "all") count++;
    if (cityFilter !== "all") count++;
    if (venueFilter !== "all") count++;
    if (ratingFilter !== "all") count++;
    if (paymentFilter !== "all") count++;
    if (dateFilter !== "all") count++;
    if (rateMin || rateMax) count++;
    return count;
  }, [
    searchTerm,
    stateFilter,
    cityFilter,
    venueFilter,
    ratingFilter,
    paymentFilter,
    dateFilter,
    rateMin,
    rateMax,
  ]);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getVenueBadge = (venue: string | null) => {
    const badges: Record<
      string,
      { label: string; color: string; icon: string }
    > = {
      host: {
        label: "Host",
        color:
          "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100",
        icon: "🏠",
      },
      visit: {
        label: "Visit",
        color: "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100",
        icon: "🚗",
      },
      both: {
        label: "Both",
        color:
          "bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-100",
        icon: "🔄",
      },
    };
    return (
      badges[venue || ""] || {
        label: "Not Set",
        color: "bg-gray-100 text-gray-800",
        icon: "❓",
      }
    );
  };

  const getRatingBadge = (rating: number | null) => {
    if (rating === null) {
      return {
        label: "No Rating",
        color: "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100",
        stars: 0,
      };
    }
    if (rating >= 4.5) {
      return {
        label: "Excellent",
        color:
          "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100",
        stars: 5,
      };
    }
    if (rating >= 3.5) {
      return {
        label: "Good",
        color: "bg-lime-100 dark:bg-lime-900 text-lime-800 dark:text-lime-100",
        stars: 4,
      };
    }
    if (rating >= 2.5) {
      return {
        label: "Average",
        color:
          "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100",
        stars: 3,
      };
    }
    return {
      label: "Poor",
      color:
        "bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-100",
      stars: 2,
    };
  };

  const getVideoBadge = (offersVideo: boolean) => {
    return offersVideo ? {
      label: "Offers Video",
      color: "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100",
      icon: <Video className="h-3 w-3" />
    } : {
      label: "No Video",
      color: "bg-gray-100 text-gray-500",
      icon: <Video className="h-3 w-3 opacity-50" />
    };
  };

  const getPaymentBadge = (paymentStatus: Professional["paymentStatus"]) => {
    if (paymentStatus.isBlocked) {
      return {
        label: "Blocked",
        color: "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100",
        icon: "🚫",
      };
    }
    if (paymentStatus.hasValidPaymentMethod) {
      return {
        label: "Valid",
        color:
          "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100",
        icon: "✅",
      };
    }
    return {
      label: "Invalid",
      color:
        "bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-100",
      icon: "⚠️",
    };
  };

  // Chart data transformations
  const venueChartData = statistics
    ? [
      { name: "Host", value: statistics.venueDistribution.host },
      { name: "Visit", value: statistics.venueDistribution.visit },
      { name: "Both", value: statistics.venueDistribution.both },
    ]
    : [];

  const ratingChartData = statistics
    ? [
      {
        name: "Excellent (4.5+)",
        value: statistics.ratingDistribution.excellent,
        fill: RATING_COLORS.excellent,
      },
      {
        name: "Good (3.5-4.5)",
        value: statistics.ratingDistribution.good,
        fill: RATING_COLORS.good,
      },
      {
        name: "Average (2.5-3.5)",
        value: statistics.ratingDistribution.average,
        fill: RATING_COLORS.average,
      },
      {
        name: "Poor (<2.5)",
        value: statistics.ratingDistribution.poor,
        fill: RATING_COLORS.poor,
      },
      {
        name: "No Rating",
        value: statistics.ratingDistribution.noRating,
        fill: RATING_COLORS.noRating,
      },
    ]
    : [];

  const paymentChartData = statistics
    ? [
      { name: "Valid", value: statistics.paymentStatusDistribution.valid },
      {
        name: "Invalid",
        value: statistics.paymentStatusDistribution.invalid,
      },
      {
        name: "Blocked",
        value: statistics.paymentStatusDistribution.blocked,
      },
    ]
    : [];

  const monthlyChartData = statistics
    ? statistics.monthlyRegistrations.map((item) => ({
      name: new Date(item.month + "-01").toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      }),
      professionals: item.count,
    }))
    : [];

  const weeklyChartData = statistics
    ? statistics.weeklyRegistrations.map((item) => ({
      name: new Date(item.week).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      professionals: item.count,
    }))
    : [];

  const reviewContributionData = statistics
    ? [
      { name: "With Reviews", value: statistics.reviewStats.withReviews },
      {
        name: "Without Reviews",
        value: statistics.reviewStats.withoutReviews,
      },
    ]
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
              <Briefcase className="h-6 w-6" />
              <div>
                <CardTitle className="text-2xl font-bold">
                  Hug Harmony Professionals
                </CardTitle>
                <p className="text-sm opacity-80">
                  Manage all professionals • Total: {professionals.length} •
                  Showing: {filteredProfessionals.length}
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
                  placeholder="Search by name, bio, or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-[#C4C4C4] focus:ring-[#F3CFC6] dark:bg-black dark:text-white"
                  aria-label="Search professionals"
                />
              </div>

              {/* Filter Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

                {/* Venue Type Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Venue Type
                  </label>
                  <Select value={venueFilter} onValueChange={setVenueFilter}>
                    <SelectTrigger className="border-[#F3CFC6]">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="host">🏠 Host</SelectItem>
                      <SelectItem value="visit">🚗 Visit</SelectItem>
                      <SelectItem value="both">🔄 Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Rating Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                    <Star className="h-4 w-4" />
                    Rating
                  </label>
                  <Select value={ratingFilter} onValueChange={setRatingFilter}>
                    <SelectTrigger className="border-[#F3CFC6]">
                      <SelectValue placeholder="All Ratings" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Ratings</SelectItem>
                      <SelectItem value="4.5">⭐ 4.5+ (Excellent)</SelectItem>
                      <SelectItem value="3.5">⭐ 3.5+ (Good)</SelectItem>
                      <SelectItem value="2.5">⭐ 2.5+ (Average)</SelectItem>
                      <SelectItem value="0">⭐ Any Rating</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Payment Status Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                    <CreditCard className="h-4 w-4" />
                    Payment Status
                  </label>
                  <Select
                    value={paymentFilter}
                    onValueChange={setPaymentFilter}
                  >
                    <SelectTrigger className="border-[#F3CFC6]">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="valid">✅ Valid Payment</SelectItem>
                      <SelectItem value="invalid">
                        ⚠️ Invalid Payment
                      </SelectItem>
                      <SelectItem value="blocked">🚫 Blocked</SelectItem>
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

                {/* Rate Range */}
                <div className="space-y-2 lg:col-span-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    Rate Range ($/hr)
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder={`Min ($${filterOptions.rateRange.min})`}
                      value={rateMin}
                      onChange={(e) => setRateMin(e.target.value)}
                      className="border-[#C4C4C4]"
                    />
                    <span className="text-gray-500">-</span>
                    <Input
                      type="number"
                      placeholder={`Max ($${filterOptions.rateRange.max})`}
                      value={rateMax}
                      onChange={(e) => setRateMax(e.target.value)}
                      className="border-[#C4C4C4]"
                    />
                  </div>
                </div>
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
                  {venueFilter !== "all" && (
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-[#F3CFC6]/20 dark:bg-[#C4C4C4]/20 rounded-full text-sm text-[#F3CFC6] dark:text-white">
                      Venue: {venueFilter}
                      <button
                        onClick={() => setVenueFilter("all")}
                        className="hover:opacity-70"
                      >
                        ✕
                      </button>
                    </span>
                  )}
                  {ratingFilter !== "all" && (
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-[#F3CFC6]/20 dark:bg-[#C4C4C4]/20 rounded-full text-sm text-[#F3CFC6] dark:text-white">
                      Rating: {ratingFilter}+
                      <button
                        onClick={() => setRatingFilter("all")}
                        className="hover:opacity-70"
                      >
                        ✕
                      </button>
                    </span>
                  )}
                  {paymentFilter !== "all" && (
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-[#F3CFC6]/20 dark:bg-[#C4C4C4]/20 rounded-full text-sm text-[#F3CFC6] dark:text-white">
                      Payment: {paymentFilter}
                      <button
                        onClick={() => setPaymentFilter("all")}
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
                  {(rateMin || rateMax) && (
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-[#F3CFC6]/20 dark:bg-[#C4C4C4]/20 rounded-full text-sm text-[#F3CFC6] dark:text-white">
                      Rate: ${rateMin || "0"} - ${rateMax || "∞"}
                      <button
                        onClick={() => {
                          setRateMin("");
                          setRateMax("");
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
                      Total Professionals
                    </p>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                      {statistics?.totalFiltered || 0}
                    </p>
                  </div>
                  <Briefcase className="h-8 w-8 text-green-500 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Total Reviews
                    </p>
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                      {statistics?.reviewStats.totalReviews || 0}
                    </p>
                  </div>
                  <MessageSquare className="h-8 w-8 text-blue-500 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Total Earnings
                    </p>
                    <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                      {formatCurrency(
                        statistics?.earningsStats.totalGross || 0
                      )}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-purple-500 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900 dark:to-orange-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Platform Fees
                    </p>
                    <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                      {formatCurrency(
                        statistics?.earningsStats.totalPlatformFees || 0
                      )}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-orange-500 opacity-50" />
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
                      dataKey="professionals"
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
                    <Bar
                      dataKey="professionals"
                      fill="#C4C4C4"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Venue Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-[#F3CFC6]" />
                  Venue Type Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={venueChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {venueChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={Object.values(VENUE_COLORS)[index]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Rating Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Star className="h-5 w-5 text-[#F3CFC6]" />
                  Rating Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={ratingChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" fontSize={12} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      fontSize={12}
                      width={100}
                    />
                    <Tooltip />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {ratingChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Payment Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-[#F3CFC6]" />
                  Payment Status Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={paymentChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {paymentChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={Object.values(PAYMENT_COLORS)[index]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Review Contributions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-[#F3CFC6]" />
                  Review Contributions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={reviewContributionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                      >
                        <Cell fill="#22c55e" />
                        <Cell fill="#9ca3af" />
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded p-3">
                      <p className="text-2xl font-bold text-[#F3CFC6]">
                        {statistics?.reviewStats.totalReviews || 0}
                      </p>
                      <p className="text-xs text-gray-500">Total Reviews</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded p-3">
                      <p className="text-2xl font-bold text-[#F3CFC6]">
                        {statistics?.reviewStats.averageReviewsPerPro.toFixed(
                          1
                        ) || 0}
                      </p>
                      <p className="text-xs text-gray-500">Avg per Pro</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Rate Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-[#F3CFC6]" />
                  Rate Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={statistics?.rateDistribution || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#F3CFC6" radius={[4, 4, 0, 0]} />
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
                    <Bar dataKey="count" fill="#C4C4C4" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Professionals Table in Chart View */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Filtered Professionals List
              </CardTitle>
              <p className="text-sm text-gray-500">
                {filteredProfessionals.length} professionals match your filters
              </p>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <table className="w-full">
                  <thead className="sticky top-0 bg-white dark:bg-gray-900">
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium">
                        Professional
                      </th>
                      <th className="text-left p-2 font-medium">Location</th>
                      <th className="text-left p-2 font-medium">Rating</th>
                      <th className="text-left p-2 font-medium">Reviews</th>
                      <th className="text-left p-2 font-medium">Rate</th>
                      <th className="text-left p-2 font-medium">Earnings</th>
                      <th className="text-left p-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProfessionals.map((pro) => {
                      const ratingBadge = getRatingBadge(pro.rating);
                      return (
                        <tr
                          key={pro.id}
                          className="border-b hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage
                                  src={
                                    pro.image ||
                                    "/assets/images/avatar-placeholder.png"
                                  }
                                />
                                <AvatarFallback className="bg-[#F3CFC6] text-black text-xs">
                                  {pro.name[0]?.toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-sm">
                                  {pro.name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {pro.linkedUser?.email || "No linked user"}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="p-2 text-sm">
                            {pro.parsedLocation.city && pro.parsedLocation.state
                              ? `${pro.parsedLocation.city}, ${pro.parsedLocation.state}`
                              : pro.location || "—"}
                          </td>
                          <td className="p-2">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${ratingBadge.color}`}
                            >
                              <Star className="h-3 w-3" />
                              {pro.rating?.toFixed(1) || "N/A"}
                            </span>
                          </td>
                          <td className="p-2 text-sm">{pro.reviewCount}</td>
                          <td className="p-2 text-sm">
                            {pro.rate ? formatCurrency(pro.rate) : "—"}/hr
                          </td>
                          <td className="p-2 text-sm">
                            {formatCurrency(pro.stats.totalEarnings)}
                          </td>
                          <td className="p-2">
                            <Button asChild variant="outline" size="sm">
                              <Link
                                href={`/admin/dashboard/professionals/${pro.id}`}
                              >
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
                    className="h-64 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"
                  />
                ))}
              </div>
            ) : filteredProfessionals.length === 0 ? (
              <div className="p-8 text-center text-[#C4C4C4]">
                <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No professionals found</p>
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
              <ScrollArea className="h-[700px] pr-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <AnimatePresence>
                    {filteredProfessionals.map((pro) => {
                      const venueBadge = getVenueBadge(pro.venue);
                      const ratingBadge = getRatingBadge(pro.rating);
                      const paymentBadge = getPaymentBadge(pro.paymentStatus);

                      return (
                        <motion.div
                          key={pro.id}
                          variants={itemVariants}
                          initial="hidden"
                          animate="visible"
                          exit={{ opacity: 0, x: -20 }}
                          className="flex flex-col justify-between p-4 hover:bg-[#F3CFC6]/10 dark:hover:bg-[#C4C4C4]/10 transition-colors border border-[#C4C4C4] rounded-lg"
                        >
                          {/* Top Section - Professional Info */}
                          <div className="space-y-3">
                            {/* Avatar and Name */}
                            <div className="flex items-start gap-3">
                              <Avatar className="h-14 w-14 border-2 border-[#F3CFC6] flex-shrink-0">
                                <AvatarImage
                                  src={
                                    pro.image ||
                                    "/assets/images/avatar-placeholder.png"
                                  }
                                  alt={pro.name}
                                  className="object-cover"
                                />
                                <AvatarFallback className="bg-[#F3CFC6] text-black text-lg font-bold">
                                  {pro.name[0]?.toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-black dark:text-white truncate text-lg">
                                  {pro.name}
                                </p>
                                {pro.linkedUser && (
                                  <p className="text-xs text-[#C4C4C4] truncate">
                                    {pro.linkedUser.email}
                                  </p>
                                )}
                                {pro.location && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                                    <MapPin className="h-3 w-3" />
                                    {pro.parsedLocation.city &&
                                      pro.parsedLocation.state
                                      ? `${pro.parsedLocation.city}, ${pro.parsedLocation.state}`
                                      : pro.location}
                                  </p>
                                )}
                              </div>
                              {/* Rate Badge */}
                              {pro.rate && (
                                <div className="flex flex-col items-end gap-1">
                                  <div className="bg-[#F3CFC6] text-black px-2 py-1 rounded-lg text-sm font-bold">
                                    ${pro.rate}/hr
                                  </div>
                                  {pro.offersVideo && (
                                    <div className="text-blue-600 dark:text-blue-400 text-xs font-bold">
                                      ${pro.videoRate || pro.rate}/video
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Rating and Reviews */}
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-4 w-4 ${i < (pro.rating || 0)
                                      ? "text-yellow-400 fill-yellow-400"
                                      : "text-gray-300"
                                      }`}
                                  />
                                ))}
                              </div>
                              <span className="text-sm font-medium">
                                {pro.rating?.toFixed(1) || "N/A"}
                              </span>
                              <span className="text-sm text-gray-500">
                                ({pro.reviewCount} reviews)
                              </span>
                            </div>

                            {/* Status Badges */}
                            <div className="flex flex-wrap gap-2">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${venueBadge.color}`}
                              >
                                {venueBadge.icon} {venueBadge.label}
                              </span>
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${ratingBadge.color}`}
                              >
                                ⭐ {ratingBadge.label}
                              </span>
                              <span
                                className={`${getVideoBadge(pro.offersVideo).color} inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold`}
                              >
                                {getVideoBadge(pro.offersVideo).icon} {getVideoBadge(pro.offersVideo).label}
                              </span>
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${paymentBadge.color}`}
                              >
                                {paymentBadge.icon} {paymentBadge.label}
                              </span>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-4 gap-2 text-xs">
                              <div className="bg-[#F3CFC6]/10 dark:bg-[#C4C4C4]/10 rounded p-2 text-center">
                                <p className="text-[#C4C4C4] flex items-center justify-center gap-1">
                                  <Users className="h-3 w-3" />
                                  Appts
                                </p>
                                <p className="font-semibold text-black dark:text-white">
                                  {pro.stats.totalAppointments}
                                </p>
                              </div>
                              <div className="bg-[#F3CFC6]/10 dark:bg-[#C4C4C4]/10 rounded p-2 text-center">
                                <p className="text-[#C4C4C4] flex items-center justify-center gap-1">
                                  <MessageSquare className="h-3 w-3" />
                                  Reviews
                                </p>
                                <p className="font-semibold text-black dark:text-white">
                                  {pro.stats.totalReviews}
                                </p>
                              </div>
                              <div className="bg-[#F3CFC6]/10 dark:bg-[#C4C4C4]/10 rounded p-2 text-center">
                                <p className="text-[#C4C4C4] flex items-center justify-center gap-1">
                                  <Eye className="h-3 w-3" />
                                  Visits
                                </p>
                                <p className="font-semibold text-black dark:text-white">
                                  {pro.stats.profileVisits}
                                </p>
                              </div>
                              <div className="bg-[#F3CFC6]/10 dark:bg-[#C4C4C4]/10 rounded p-2 text-center">
                                <p className="text-[#C4C4C4] flex items-center justify-center gap-1">
                                  <DollarSign className="h-3 w-3" />
                                  Earned
                                </p>
                                <p className="font-semibold text-black dark:text-white">
                                  ${pro.stats.totalEarnings.toFixed(0)}
                                </p>
                              </div>
                            </div>

                            {/* Earnings Info */}
                            <div className="flex items-center justify-between text-xs bg-gray-50 dark:bg-gray-800 rounded p-2">
                              <div>
                                <span className="text-gray-500">
                                  Platform Fees:{" "}
                                </span>
                                <span className="font-medium text-orange-600">
                                  {formatCurrency(pro.stats.platformFees)}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">
                                  Company Cut:{" "}
                                </span>
                                <span className="font-medium">
                                  {pro.companyCutPercentage || 0}%
                                </span>
                              </div>
                            </div>

                            {/* Payment Info */}
                            {pro.paymentStatus.cardLast4 && (
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <CreditCard className="h-3 w-3" />
                                <span>
                                  {pro.paymentStatus.cardBrand?.toUpperCase()}{" "}
                                  •••• {pro.paymentStatus.cardLast4}
                                </span>
                              </div>
                            )}

                            {/* Joined & Application Status */}
                            <div className="text-xs space-y-1 text-[#C4C4C4]">
                              <p>Joined: {formatDate(pro.createdAt)}</p>
                              {pro.applicationStatus && (
                                <p>Application: {pro.applicationStatus}</p>
                              )}
                            </div>
                          </div>

                          {/* Bottom Section - Actions */}
                          <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#C4C4C4] mt-3">
                            {pro.linkedUser && (
                              <Button
                                asChild
                                variant="ghost"
                                size="sm"
                                className="text-xs"
                              >
                                <Link
                                  href={`/admin/dashboard/users/${pro.linkedUser.id}`}
                                >
                                  View User
                                </Link>
                              </Button>
                            )}
                            <Button
                              asChild
                              variant="outline"
                              size="sm"
                              className="border-[#F3CFC6] text-[#F3CFC6] hover:bg-[#F3CFC6]/10 ml-auto"
                            >
                              <Link
                                href={`/admin/dashboard/professionals/${pro.id}`}
                              >
                                View Details
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
