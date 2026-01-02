// src/app/dashboard/video-session/page.tsx
"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Filter,
  Video,
  RefreshCw,
  Keyboard,
  X,
  Calendar,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface VideoSession {
  id: string;
  professional: { name: string; id: string };
  date: string;
  time: string;
  status: "upcoming" | "completed" | "cancelled";
  roomId?: string;
}

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, staggerChildren: 0.2 },
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

// Status color mapping
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  upcoming: { bg: "bg-blue-100", text: "text-blue-700" },
  completed: { bg: "bg-green-100", text: "text-green-700" },
  cancelled: { bg: "bg-gray-100", text: "text-gray-700" },
};

export default function VideoSessionsPage() {
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const [videoSessions, setVideoSessions] = useState<VideoSession[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { data: session, status } = useSession();
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut handler (/ to focus)
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

  // Fetch data function
  const fetchData = useCallback(
    async (showRefreshToast = false) => {
      if (status !== "authenticated" || !session?.user?.id) return;

      if (showRefreshToast) setRefreshing(true);

      try {
        const res = await fetch(
          `/api/videoSessions?userId=${session.user.id}`,
          {
            cache: "no-store",
            credentials: "include",
          }
        );

        if (!res.ok) {
          throw new Error(`Failed to fetch video sessions: ${res.status}`);
        }

        const data = await res.json();
        setVideoSessions(Array.isArray(data) ? data : []);

        if (showRefreshToast) {
          toast.success("Data refreshed");
        }
      } catch (error) {
        console.error("Error fetching video sessions:", error);
        toast.error("Failed to load video sessions");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [status, session]
  );

  useEffect(() => {
    if (status === "authenticated") {
      fetchData();
    }
  }, [status, session, fetchData]);

  // Handle search
  const handleSearch = useCallback(() => {
    if (searchQuery.trim()) {
      toast.info(`Searching for "${searchQuery}"...`);
    }
  }, [searchQuery]);

  // Filtered sessions
  const filteredSessions = useMemo(() => {
    return videoSessions
      .filter((session) =>
        searchQuery
          ? session.professional.name
              .toLowerCase()
              .includes(searchQuery.toLowerCase())
          : true
      )
      .filter((session) =>
        statusFilter ? session.status === statusFilter : true
      );
  }, [videoSessions, searchQuery, statusFilter]);

  // Stats
  const stats = useMemo(() => {
    return {
      upcoming: videoSessions.filter((s) => s.status === "upcoming").length,
      completed: videoSessions.filter((s) => s.status === "completed").length,
      cancelled: videoSessions.filter((s) => s.status === "cancelled").length,
      total: videoSessions.length,
    };
  }, [videoSessions]);

  // Loading state
  if (status === "loading" || loading) {
    return <VideoSessionsSkeleton />;
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
                  <Video className="h-6 w-6" />
                  Your Video Sessions
                </CardTitle>
                <p className="text-sm text-black/70 mt-1">
                  Manage your video appointments with ease
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchData(true)}
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
              <p className="text-2xl font-bold text-blue-600">
                {stats.upcoming}
              </p>
              <p className="text-xs text-gray-600">Upcoming</p>
            </div>
            <div className="bg-white/80 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-600">
                {stats.completed}
              </p>
              <p className="text-xs text-gray-600">Completed</p>
            </div>
            <div className="bg-white/80 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-gray-600">
                {stats.cancelled}
              </p>
              <p className="text-xs text-gray-600">Cancelled</p>
            </div>
            <div className="bg-white/80 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
              <p className="text-xs text-gray-600">Total</p>
            </div>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row items-center gap-2">
            {/* Search Input - Enhanced Pattern */}
            <div className="relative flex-grow w-full">
              <Search
                className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground pointer-events-none"
                aria-hidden="true"
              />
              <Input
                ref={searchInputRef}
                type="text"
                placeholder="Search by professional name... (press / to focus)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-12 py-3 rounded-lg border bg-white shadow-sm focus:ring-2 focus:ring-[#F3CFC6]/50"
                data-search-input
                aria-label="Search by professional name"
              />
              {/* Right side container - either shows clear button OR keyboard hint */}
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

            {/* Status Filter Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full sm:w-auto bg-white shadow-sm"
                >
                  <Filter className="mr-2 h-4 w-4" aria-hidden="true" />
                  {statusFilter
                    ? statusFilter.charAt(0).toUpperCase() +
                      statusFilter.slice(1)
                    : "All Status"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setStatusFilter("")}>
                  All
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {["upcoming", "completed", "cancelled"].map((s) => (
                  <DropdownMenuItem key={s} onSelect={() => setStatusFilter(s)}>
                    <Badge
                      className={`${STATUS_COLORS[s].bg} ${STATUS_COLORS[s].text} mr-2`}
                    >
                      {s}
                    </Badge>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-black dark:text-white">
            <Calendar className="mr-2 h-5 w-5 text-[#F3CFC6]" />
            All Video Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeTab}
            onValueChange={(value) =>
              setActiveTab(value as "upcoming" | "past")
            }
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 bg-[#F3CFC6]/20">
              <TabsTrigger value="upcoming" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Upcoming (
                {filteredSessions.filter((s) => s.status === "upcoming").length}
                )
              </TabsTrigger>
              <TabsTrigger value="past" className="flex items-center gap-2">
                <Video className="h-4 w-4" />
                Past (
                {filteredSessions.filter((s) => s.status !== "upcoming").length}
                )
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="mt-4">
              <motion.div className="space-y-3" variants={containerVariants}>
                <AnimatePresence>
                  {filteredSessions
                    .filter((session) => session.status === "upcoming")
                    .map((session) => (
                      <motion.div
                        key={session.id}
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        whileHover={{
                          scale: 1.02,
                          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        }}
                        transition={{ duration: 0.2 }}
                        className="flex items-center justify-between p-4 bg-white border rounded-lg shadow-sm hover:border-[#F3CFC6] transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-full bg-[#F3CFC6]/20 flex items-center justify-center">
                            <Video className="h-6 w-6 text-[#F3CFC6]" />
                          </div>
                          <div>
                            <p className="font-semibold text-black">
                              {session.professional.name}
                            </p>
                            <p className="text-sm text-gray-500 flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {session.date} at {session.time}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge
                            className={`${STATUS_COLORS[session.status].bg} ${STATUS_COLORS[session.status].text}`}
                          >
                            {session.status}
                          </Badge>
                          <Button
                            size="sm"
                            className="bg-[#F3CFC6] hover:bg-[#e9bfb5] text-gray-800"
                            onClick={() =>
                              router.push(
                                `/dashboard/video-session/${session.id}`
                              )
                            }
                          >
                            <Video className="mr-2 h-4 w-4" />
                            Join Session
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                </AnimatePresence>
                {filteredSessions.filter((s) => s.status === "upcoming")
                  .length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                    <Video className="h-12 w-12 mb-3 opacity-50" />
                    <p className="text-lg font-medium">No upcoming sessions</p>
                    <p className="text-sm">
                      {searchQuery || statusFilter
                        ? "Try adjusting your filters"
                        : "Book a session to get started"}
                    </p>
                  </div>
                )}
              </motion.div>
            </TabsContent>

            <TabsContent value="past" className="mt-4">
              <motion.div className="space-y-3" variants={containerVariants}>
                <AnimatePresence>
                  {filteredSessions
                    .filter((session) => session.status !== "upcoming")
                    .map((session) => (
                      <motion.div
                        key={session.id}
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        whileHover={{
                          scale: 1.02,
                          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        }}
                        transition={{ duration: 0.2 }}
                        className="flex items-center justify-between p-4 bg-white border rounded-lg shadow-sm hover:border-[#F3CFC6] transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                            <Video className="h-6 w-6 text-gray-400" />
                          </div>
                          <div>
                            <p className="font-semibold text-black">
                              {session.professional.name}
                            </p>
                            <p className="text-sm text-gray-500 flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {session.date} at {session.time}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge
                            className={`${STATUS_COLORS[session.status].bg} ${STATUS_COLORS[session.status].text}`}
                          >
                            {session.status}
                          </Badge>
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="border-[#F3CFC6] text-gray-700 hover:bg-[#F3CFC6]/10"
                          >
                            <Link href={`/appointments/${session.id}`}>
                              View Details
                            </Link>
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                </AnimatePresence>
                {filteredSessions.filter((s) => s.status !== "upcoming")
                  .length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                    <Video className="h-12 w-12 mb-3 opacity-50" />
                    <p className="text-lg font-medium">No past sessions</p>
                    <p className="text-sm">
                      {searchQuery || statusFilter
                        ? "Try adjusting your filters"
                        : "Your completed sessions will appear here"}
                    </p>
                  </div>
                )}
              </motion.div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Skeleton loader
function VideoSessionsSkeleton() {
  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto">
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4]">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-8 w-48 bg-white/50" />
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
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-full mb-4" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
