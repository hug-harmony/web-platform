"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Filter,
  Eye,
  MessageSquare,
  RefreshCw,
  Keyboard,
  X,
  Users,
  TrendingUp,
  Clock,
  Calendar,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import useSWR, { mutate } from "swr";

interface ProfileVisit {
  id: string;
  user: { id: string; name: string; avatar?: string | null };
  visited: { id: string; name: string; type: "user" | "professional" };
  createdAt: string;
}

interface VisitorStats {
  userId: string;
  name: string;
  avatar?: string | null;
  visitCount: number;
  lastVisit: string;
}

const fetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch profile visits");
    return res.json();
  });

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

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

// Filter color mapping
const FILTER_COLORS: Record<string, { bg: string; text: string }> = {
  today: { bg: "bg-green-100", text: "text-green-700" },
  "7d": { bg: "bg-blue-100", text: "text-blue-700" },
  "30d": { bg: "bg-purple-100", text: "text-purple-700" },
  all: { bg: "bg-gray-100", text: "text-gray-700" },
};

type FilterOption = "today" | "7d" | "30d" | "all";

export default function ProfileVisitsPage() {
  const [filter, setFilter] = useState<FilterOption>("7d");
  const [searchQuery, setSearchQuery] = useState("");
  const { status } = useSession();
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut handler
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
        setSearchQuery("");
        searchInputRef.current?.blur();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const {
    data,
    error,
    isLoading,
    mutate: refreshData,
  } = useSWR(`/api/profile-visits?filter=${filter}`, fetcher);

  const [refreshing, setRefreshing] = useState(false);

  // Memoize visits array to prevent dependency issues
  const visits: ProfileVisit[] = useMemo(
    () => data?.visits || [],
    [data?.visits]
  );

  // Process visitors - client-side
  const visitorMap = useMemo(() => {
    const map = new Map<string, VisitorStats>();
    visits.forEach((visit: ProfileVisit) => {
      const existing = map.get(visit.user.id) || {
        userId: visit.user.id,
        name: visit.user.name || "User",
        avatar: visit.user.avatar || null,
        visitCount: 0,
        lastVisit: visit.createdAt,
      };
      existing.visitCount += 1;
      existing.lastVisit =
        new Date(visit.createdAt) > new Date(existing.lastVisit)
          ? visit.createdAt
          : existing.lastVisit;
      map.set(visit.user.id, existing);
    });
    return map;
  }, [visits]);

  // Filter visitors by search - client-side
  const filteredVisitors = useMemo(() => {
    return Array.from(visitorMap.values()).filter((v) =>
      searchQuery
        ? v.name.toLowerCase().includes(searchQuery.toLowerCase())
        : true
    );
  }, [visitorMap, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const totalVisits = visits.length;
    const uniqueVisitors = visitorMap.size;
    const returningVisitors = Array.from(visitorMap.values()).filter(
      (v) => v.visitCount > 1
    ).length;
    const avgVisitsPerUser =
      uniqueVisitors > 0 ? (totalVisits / uniqueVisitors).toFixed(1) : "0";

    return {
      totalVisits,
      uniqueVisitors,
      returningVisitors,
      avgVisitsPerUser,
    };
  }, [visits, visitorMap]);

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshData();
      toast.success("Profile visits refreshed");
    } catch {
      toast.error("Failed to refresh");
    } finally {
      setRefreshing(false);
    }
  }, [refreshData]);

  // Filter change handler
  const handleFilterChange = (value: FilterOption) => {
    setFilter(value);
    mutate(`/api/profile-visits?filter=${value}`);
  };

  // Search button click
  const handleSearch = useCallback(() => {
    if (searchQuery.trim()) {
      toast.info(`Searching for "${searchQuery}"...`);
    }
  }, [searchQuery]);

  // Message click handler
  const handleMessageClick = async (userId: string) => {
    if (!userId || !/^[0-9a-fA-F]{24}$/.test(userId)) {
      toast.error("Invalid user ID");
      return;
    }
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId: userId }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
      const conversation = await res.json();
      router.push(`/dashboard/messaging/${conversation.id}`);
    } catch {
      toast.error("Failed to start conversation");
    }
  };

  // Get filter label
  const getFilterLabel = (filterKey: string) => {
    switch (filterKey) {
      case "today":
        return "Today";
      case "7d":
        return "Last 7 days";
      case "30d":
        return "Last 30 days";
      case "all":
        return "All time";
      default:
        return filterKey;
    }
  };

  // Format relative time
  const formatRelativeTime = (date: string) => {
    const now = new Date();
    const visitDate = new Date(date);
    const diffInSeconds = Math.floor(
      (now.getTime() - visitDate.getTime()) / 1000
    );

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800)
      return `${Math.floor(diffInSeconds / 86400)}d ago`;

    return visitDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  // Loading state
  if (status === "loading" || isLoading) {
    return <ProfileVisitsSkeleton />;
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  return (
    <motion.div
      className="p-4 space-y-6 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
        <CardHeader className="pb-2">
          <motion.div variants={itemVariants}>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold text-black flex items-center gap-2">
                  <Eye className="h-6 w-6" />
                  Profile Visits
                </CardTitle>
                <p className="text-sm text-black/70 mt-1">
                  See who&apos;s been viewing your profile •{" "}
                  {getFilterLabel(filter)}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                className="rounded-full bg-white/80 hover:bg-white"
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>
          </motion.div>
        </CardHeader>
        <CardContent>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-white/80 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-gray-800">
                {stats.totalVisits}
              </p>
              <p className="text-xs text-gray-600 flex items-center justify-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Total Visits
              </p>
            </div>
            <div className="bg-white/80 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-blue-600">
                {stats.uniqueVisitors}
              </p>
              <p className="text-xs text-gray-600 flex items-center justify-center gap-1">
                <Users className="h-3 w-3" />
                Unique Visitors
              </p>
            </div>
            <div className="bg-white/80 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-purple-600">
                {stats.returningVisitors}
              </p>
              <p className="text-xs text-gray-600 flex items-center justify-center gap-1">
                <RefreshCw className="h-3 w-3" />
                Returning
              </p>
            </div>
            <div className="bg-white/80 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-600">
                {stats.avgVisitsPerUser}
              </p>
              <p className="text-xs text-gray-600 flex items-center justify-center gap-1">
                <Clock className="h-3 w-3" />
                Avg/Visitor
              </p>
            </div>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row items-center gap-2">
            {/* Search Input */}
            <div className="relative flex-grow w-full">
              <Search
                className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground pointer-events-none"
                aria-hidden="true"
              />
              <Input
                ref={searchInputRef}
                type="text"
                placeholder="Search by visitor name... (press / to focus)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-12 py-3 rounded-lg border bg-white shadow-sm focus:ring-2 focus:ring-[#F3CFC6]/50"
                data-search-input
                aria-label="Search visitors"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center">
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded-sm hover:bg-muted"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                ) : (
                  <div className="hidden sm:flex items-center text-xs text-muted-foreground">
                    <Keyboard className="h-3 w-3 mr-1" aria-hidden="true" />
                    <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">
                      /
                    </kbd>
                  </div>
                )}
              </div>
            </div>

            {/* Search Button */}
            <Button
              onClick={handleSearch}
              className="w-full sm:w-auto bg-white hover:bg-white/80 text-gray-800 shadow-sm"
            >
              <Search className="mr-2 h-4 w-4" aria-hidden="true" />
              Search
            </Button>

            {/* Time Period Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full sm:w-auto bg-white shadow-sm"
                >
                  <Filter className="mr-2 h-4 w-4" aria-hidden="true" />
                  {getFilterLabel(filter)}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Time Period</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(["today", "7d", "30d", "all"] as FilterOption[]).map(
                  (filterKey) => {
                    const colors = FILTER_COLORS[filterKey];
                    return (
                      <DropdownMenuItem
                        key={filterKey}
                        onSelect={() => handleFilterChange(filterKey)}
                      >
                        <Badge className={`${colors.bg} ${colors.text} mr-2`}>
                          {getFilterLabel(filterKey)}
                        </Badge>
                      </DropdownMenuItem>
                    );
                  }
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Visitors List */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-black">
            <Users className="mr-2 h-5 w-5 text-[#F3CFC6]" />
            All Visitors
            {filteredVisitors.length > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({filteredVisitors.length})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] pr-4">
            <motion.div className="space-y-3" variants={containerVariants}>
              <AnimatePresence mode="popLayout">
                {error ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                    <Eye className="h-16 w-16 mb-4 opacity-30 text-red-400" />
                    <p className="text-red-500 text-lg font-medium mb-4">
                      Failed to load visits
                    </p>
                    <Button onClick={handleRefresh} variant="outline">
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Try Again
                    </Button>
                  </div>
                ) : filteredVisitors.length > 0 ? (
                  filteredVisitors.map((visitor) => (
                    <motion.div
                      key={visitor.userId}
                      variants={cardVariants}
                      initial="hidden"
                      animate="visible"
                      exit={{ opacity: 0, x: -20 }}
                      layout
                      whileHover={{
                        scale: 1.01,
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                      }}
                      className="flex items-center justify-between p-4 border rounded-lg bg-white hover:border-[#F3CFC6] transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12 ring-2 ring-white shadow-sm">
                          <AvatarImage
                            src={visitor.avatar || undefined}
                            alt={visitor.name}
                          />
                          <AvatarFallback className="bg-gradient-to-br from-[#F3CFC6] to-[#C4C4C4] text-white font-semibold">
                            {visitor.name
                              .split(" ")
                              .map((n) => n.charAt(0))
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-black">
                            {visitor.name}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-gray-500 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatRelativeTime(visitor.lastVisit)}
                            </span>
                            <Badge
                              variant="secondary"
                              className="text-xs bg-[#F3CFC6]/20 text-gray-700"
                            >
                              {visitor.visitCount} visit
                              {visitor.visitCount > 1 ? "s" : ""}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-[#F3CFC6] text-gray-700 hover:bg-[#F3CFC6]/10"
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              <span className="hidden sm:inline">
                                View Visits
                              </span>
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage
                                    src={visitor.avatar || undefined}
                                    alt={visitor.name}
                                  />
                                  <AvatarFallback className="bg-[#F3CFC6] text-white text-xs">
                                    {visitor.name.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                Visit History - {visitor.name}
                              </DialogTitle>
                            </DialogHeader>
                            <ScrollArea className="h-[300px] mt-4">
                              <div className="space-y-3">
                                {visits
                                  .filter((v) => v.user.id === visitor.userId)
                                  .map((visit) => (
                                    <div
                                      key={visit.id}
                                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                                    >
                                      <div className="h-8 w-8 rounded-full bg-[#F3CFC6]/20 flex items-center justify-center">
                                        <Calendar className="h-4 w-4 text-[#F3CFC6]" />
                                      </div>
                                      <div className="flex-1">
                                        <p className="text-sm font-medium text-black">
                                          Visited {visit.visited.type} profile
                                        </p>
                                        <p className="text-xs text-gray-500">
                                          {visit.visited.name} •{" "}
                                          {new Date(
                                            visit.createdAt
                                          ).toLocaleString()}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            </ScrollArea>
                          </DialogContent>
                        </Dialog>
                        <Button
                          size="sm"
                          className="bg-[#F3CFC6] hover:bg-[#e9bfb5] text-gray-800"
                          onClick={() => handleMessageClick(visitor.userId)}
                        >
                          <MessageSquare className="mr-2 h-4 w-4" />
                          <span className="hidden sm:inline">Message</span>
                        </Button>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                    <Eye className="h-16 w-16 mb-4 opacity-30" />
                    <p className="text-lg font-medium">No visitors found</p>
                    <p className="text-sm text-gray-400 mt-1">
                      {searchQuery
                        ? "Try adjusting your search"
                        : `No profile visits ${getFilterLabel(filter).toLowerCase()}`}
                    </p>
                    {searchQuery && (
                      <Button
                        variant="outline"
                        onClick={() => setSearchQuery("")}
                        className="mt-4"
                      >
                        <X className="mr-2 h-4 w-4" />
                        Clear Search
                      </Button>
                    )}
                  </div>
                )}
              </AnimatePresence>
            </motion.div>
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Skeleton loader
function ProfileVisitsSkeleton() {
  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto">
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4]">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-8 w-40 bg-white/50" />
              <Skeleton className="h-4 w-64 mt-2 bg-white/50" />
            </div>
            <Skeleton className="h-9 w-24 rounded-full bg-white/50" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 rounded-lg bg-white/50" />
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Skeleton className="h-12 flex-1 bg-white/50" />
            <Skeleton className="h-12 w-24 bg-white/50" />
            <Skeleton className="h-12 w-32 bg-white/50" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div>
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-3 w-48 mt-2" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-9 w-24" />
                  <Skeleton className="h-9 w-24" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
