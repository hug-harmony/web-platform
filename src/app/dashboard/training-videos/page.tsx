"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Video,
  Play,
  CheckCircle,
  Clock,
  Filter,
  BookOpen,
  RefreshCw,
  Keyboard,
  X,
  PlayCircle,
  Trophy,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import VideoPlayerModal from "@/components/trainingvideos/VideoPlayerModal";

interface TrainingVideo {
  id: string;
  name: string;
  url: string;
  durationSec?: number | null;
  isActive: boolean;
  createdAt: string;
  userProgress?: {
    watchedSec: number;
    isCompleted: boolean;
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

// Status color mapping
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  all: { bg: "bg-gray-100", text: "text-gray-700" },
  completed: { bg: "bg-green-100", text: "text-green-700" },
  "in-progress": { bg: "bg-yellow-100", text: "text-yellow-700" },
  "not-started": { bg: "bg-blue-100", text: "text-blue-700" },
};

type StatusFilter = "all" | "completed" | "in-progress" | "not-started";

export default function TrainingVideosPage() {
  const [videos, setVideos] = useState<TrainingVideo[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<TrainingVideo | null>(
    null
  );

  const searchInputRef = useRef<HTMLInputElement>(null);
  const initialFetchDone = useRef(false);

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

  // Fetch videos
  const fetchVideos = useCallback(async (showRefreshToast = false) => {
    if (showRefreshToast) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const res = await fetch("/api/trainingvideos", {
        cache: "no-store",
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to fetch videos");

      const data = await res.json();
      setVideos(Array.isArray(data) ? data : []);

      if (showRefreshToast) {
        toast.success("Videos refreshed");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load training videos");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    if (!initialFetchDone.current) {
      initialFetchDone.current = true;
      fetchVideos();
    }
  }, [fetchVideos]);

  // Filter videos - client-side
  const filteredVideos = useMemo(() => {
    return videos
      .filter((video) => {
        if (!searchQuery) return true;
        return video.name.toLowerCase().includes(searchQuery.toLowerCase());
      })
      .filter((video) => {
        if (statusFilter === "all") return true;
        const progress = video.userProgress;
        if (statusFilter === "completed") return progress?.isCompleted;
        if (statusFilter === "in-progress")
          return progress && progress.watchedSec > 0 && !progress.isCompleted;
        if (statusFilter === "not-started")
          return !progress || progress.watchedSec === 0;
        return true;
      });
  }, [videos, searchQuery, statusFilter]);

  // Stats
  const stats = useMemo(() => {
    const total = videos.length;
    const completed = videos.filter((v) => v.userProgress?.isCompleted).length;
    const inProgress = videos.filter(
      (v) =>
        v.userProgress &&
        v.userProgress.watchedSec > 0 &&
        !v.userProgress.isCompleted
    ).length;
    const notStarted = total - completed - inProgress;
    const overallProgress = total > 0 ? (completed / total) * 100 : 0;

    // Calculate total watch time
    const totalWatchedSec = videos.reduce(
      (sum, v) => sum + (v.userProgress?.watchedSec || 0),
      0
    );

    return {
      total,
      completed,
      inProgress,
      notStarted,
      overallProgress,
      totalWatchedSec,
    };
  }, [videos]);

  // Format duration
  const formatDuration = (sec?: number | null) => {
    if (!sec) return "—";
    const hours = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Format watch time
  const formatWatchTime = (sec: number) => {
    if (sec < 60) return `${sec}s`;
    if (sec < 3600) return `${Math.floor(sec / 60)}m`;
    const hours = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  // Get progress percent
  const getProgressPercent = (video: TrainingVideo): number => {
    if (!video.userProgress || !video.durationSec) return 0;
    return Math.min(
      100,
      (video.userProgress.watchedSec / video.durationSec) * 100
    );
  };

  // Get filter label
  const getFilterLabel = (filterKey: string) => {
    switch (filterKey) {
      case "all":
        return "All Videos";
      case "completed":
        return "Completed";
      case "in-progress":
        return "In Progress";
      case "not-started":
        return "Not Started";
      default:
        return filterKey;
    }
  };

  // Handle search button click
  const handleSearch = useCallback(() => {
    if (searchQuery.trim()) {
      toast.info(`Searching for "${searchQuery}"...`);
    }
  }, [searchQuery]);

  // Loading state
  if (loading) {
    return <TrainingVideosSkeleton />;
  }

  return (
    <>
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
                    <BookOpen className="h-6 w-6" />
                    Training Videos
                  </CardTitle>
                  <p className="text-sm text-black/70 mt-1">
                    Learn how to use the platform effectively
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchVideos(true)}
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
                  {stats.total}
                </p>
                <p className="text-xs text-gray-600 flex items-center justify-center gap-1">
                  <Video className="h-3 w-3" />
                  Total Videos
                </p>
              </div>
              <div className="bg-white/80 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-600">
                  {stats.completed}
                </p>
                <p className="text-xs text-gray-600 flex items-center justify-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Completed
                </p>
              </div>
              <div className="bg-white/80 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-yellow-600">
                  {stats.inProgress}
                </p>
                <p className="text-xs text-gray-600 flex items-center justify-center gap-1">
                  <PlayCircle className="h-3 w-3" />
                  In Progress
                </p>
              </div>
              <div className="bg-white/80 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {formatWatchTime(stats.totalWatchedSec)}
                </p>
                <p className="text-xs text-gray-600 flex items-center justify-center gap-1">
                  <Clock className="h-3 w-3" />
                  Watch Time
                </p>
              </div>
            </div>

            {/* Overall Progress */}
            <div className="bg-white/80 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-[#F3CFC6]" />
                  <span className="font-medium text-black">
                    Overall Progress
                  </span>
                </div>
                <span className="text-lg font-bold text-black">
                  {Math.round(stats.overallProgress)}%
                </span>
              </div>
              <Progress
                value={stats.overallProgress}
                className="h-3 bg-gray-200"
              />
              <p className="text-xs text-gray-500 mt-2">
                {stats.completed} of {stats.total} videos completed
              </p>
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
                  placeholder="Search videos... (press / to focus)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 pr-12 py-3 rounded-lg border bg-white shadow-sm focus:ring-2 focus:ring-[#F3CFC6]/50"
                  data-search-input
                  aria-label="Search videos"
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

              {/* Status Filter Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto bg-white shadow-sm"
                  >
                    <Filter className="mr-2 h-4 w-4" aria-hidden="true" />
                    {getFilterLabel(statusFilter)}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {(
                    [
                      "all",
                      "completed",
                      "in-progress",
                      "not-started",
                    ] as StatusFilter[]
                  ).map((filterKey) => {
                    const colors = STATUS_COLORS[filterKey];
                    return (
                      <DropdownMenuItem
                        key={filterKey}
                        onSelect={() => setStatusFilter(filterKey)}
                      >
                        <Badge className={`${colors.bg} ${colors.text} mr-2`}>
                          {getFilterLabel(filterKey)}
                        </Badge>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>

        {/* Video Grid */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-black">
              <Video className="mr-2 h-5 w-5 text-[#F3CFC6]" />
              All Videos
              {filteredVideos.length > 0 && (
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({filteredVideos.length})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AnimatePresence mode="popLayout">
              {filteredVideos.length > 0 ? (
                <motion.div
                  className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
                  variants={containerVariants}
                >
                  {filteredVideos.map((video, index) => {
                    const progress = getProgressPercent(video);
                    const isCompleted = video.userProgress?.isCompleted;
                    const hasStarted =
                      video.userProgress && video.userProgress.watchedSec > 0;

                    return (
                      <motion.div
                        key={video.id}
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        exit={{ opacity: 0, scale: 0.95 }}
                        layout
                        transition={{ delay: index * 0.05 }}
                        whileHover={{
                          scale: 1.02,
                          boxShadow: "0 8px 20px rgba(0,0,0,0.12)",
                        }}
                      >
                        <Card
                          className={`overflow-hidden border hover:border-[#F3CFC6] transition-all cursor-pointer group ${
                            isCompleted ? "ring-2 ring-green-500/30" : ""
                          }`}
                          onClick={() => setSelectedVideo(video)}
                        >
                          {/* Thumbnail */}
                          <div className="relative h-40 bg-gradient-to-br from-[#F3CFC6] to-[#C4C4C4] flex items-center justify-center overflow-hidden">
                            <Video className="h-12 w-12 text-white/80" />

                            {/* Play Overlay */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <div className="h-16 w-16 rounded-full bg-white/90 flex items-center justify-center transform group-hover:scale-110 transition-transform">
                                <Play className="h-8 w-8 text-[#F3CFC6] ml-1" />
                              </div>
                            </div>

                            {/* Status Badge */}
                            <div className="absolute top-3 right-3">
                              {isCompleted ? (
                                <Badge className="bg-green-500 text-white gap-1">
                                  <CheckCircle className="h-3 w-3" />
                                  Completed
                                </Badge>
                              ) : hasStarted ? (
                                <Badge className="bg-yellow-500 text-white">
                                  In Progress
                                </Badge>
                              ) : (
                                <Badge className="bg-white/90 text-gray-800">
                                  New
                                </Badge>
                              )}
                            </div>

                            {/* Duration */}
                            <div className="absolute bottom-3 right-3 bg-black/70 text-white text-xs px-2 py-1 rounded-md flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDuration(video.durationSec)}
                            </div>
                          </div>

                          {/* Content */}
                          <CardContent className="p-4">
                            <h3 className="font-semibold text-black line-clamp-2 mb-3 group-hover:text-[#F3CFC6] transition-colors">
                              {video.name}
                            </h3>

                            {/* Progress Bar */}
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs text-gray-500">
                                <span>Progress</span>
                                <span className="font-medium">
                                  {Math.round(progress)}%
                                </span>
                              </div>
                              <Progress
                                value={progress}
                                className={`h-1.5 ${
                                  isCompleted ? "bg-green-100" : "bg-gray-100"
                                }`}
                              />
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                  <Video className="h-16 w-16 mb-4 opacity-30" />
                  <p className="text-lg font-medium">No videos found</p>
                  <p className="text-sm text-gray-400 mt-1">
                    {searchQuery || statusFilter !== "all"
                      ? "Try adjusting your filters"
                      : "Check back later for new content"}
                  </p>
                  {(searchQuery || statusFilter !== "all") && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchQuery("");
                        setStatusFilter("all");
                      }}
                      className="mt-4"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Clear Filters
                    </Button>
                  )}
                </div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>

      {/* Video Player Modal */}
      <AnimatePresence>
        {selectedVideo && (
          <VideoPlayerModal
            video={selectedVideo}
            onClose={() => setSelectedVideo(null)}
            onProgressUpdate={() => fetchVideos()}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// Skeleton loader
function TrainingVideosSkeleton() {
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
          <Skeleton className="h-20 rounded-lg bg-white/50 mb-4" />
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-40 w-full" />
                <CardContent className="p-4 space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-2 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
