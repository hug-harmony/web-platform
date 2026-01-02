// src/app/dashboard/training-videos/page.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Search,
  Video,
  Play,
  CheckCircle,
  Clock,
  Filter,
  BookOpen,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function TrainingVideosPage() {
  const [videos, setVideos] = useState<TrainingVideo[]>([]);
  const [filtered, setFiltered] = useState<TrainingVideo[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "completed" | "in-progress" | "not-started"
  >("all");
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<TrainingVideo | null>(
    null
  );

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/trainingvideos");
      const data = await res.json();
      setVideos(data);
      setFiltered(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let result = videos;

    // Search filter
    if (search) {
      const lower = search.toLowerCase();
      result = result.filter((v) => v.name.toLowerCase().includes(lower));
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((v) => {
        const progress = v.userProgress;
        if (statusFilter === "completed") return progress?.isCompleted;
        if (statusFilter === "in-progress")
          return progress && progress.watchedSec > 0 && !progress.isCompleted;
        if (statusFilter === "not-started")
          return !progress || progress.watchedSec === 0;
        return true;
      });
    }

    setFiltered(result);
  }, [search, statusFilter, videos]);

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

  const getProgressPercent = (video: TrainingVideo): number => {
    if (!video.userProgress || !video.durationSec) return 0;
    return Math.min(
      100,
      (video.userProgress.watchedSec / video.durationSec) * 100
    );
  };

  const stats = {
    total: videos.length,
    completed: videos.filter((v) => v.userProgress?.isCompleted).length,
    inProgress: videos.filter(
      (v) =>
        v.userProgress &&
        v.userProgress.watchedSec > 0 &&
        !v.userProgress.isCompleted
    ).length,
  };

  const overallProgress =
    videos.length > 0 ? (stats.completed / videos.length) * 100 : 0;

  return (
    <>
      <motion.div
        className="p-4 space-y-6 max-w-7xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div variants={itemVariants}>
          <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg border-0 overflow-hidden">
            <CardHeader className="pb-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-2xl font-bold text-black flex items-center gap-3">
                    <BookOpen className="h-7 w-7" />
                    Training Videos
                  </CardTitle>
                  <p className="text-sm text-black/70 mt-1">
                    Learn how to use the platform effectively
                  </p>
                </div>
                <div className="bg-white/90 rounded-xl px-4 py-3 text-center min-w-[140px]">
                  <p className="text-3xl font-bold text-black">
                    {stats.completed}/{stats.total}
                  </p>
                  <p className="text-xs text-black/60">Videos Completed</p>
                </div>
              </div>

              {/* Overall Progress */}
              <div className="mt-6">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-black/70">Overall Progress</span>
                  <span className="font-semibold text-black">
                    {Math.round(overallProgress)}%
                  </span>
                </div>
                <Progress value={overallProgress} className="h-3 bg-white/30" />
              </div>
            </CardHeader>
          </Card>
        </motion.div>

        {/* Filters */}
        <motion.div variants={itemVariants}>
          <Card className="border-[#C4C4C4]/30">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search videos..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 border-[#C4C4C4]/50 focus:border-[#F3CFC6] focus:ring-[#F3CFC6]"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select
                    value={statusFilter}
                    onValueChange={(v) =>
                      setStatusFilter(
                        v as "all" | "completed" | "in-progress" | "not-started"
                      )
                    }
                  >
                    <SelectTrigger className="w-[160px] border-[#C4C4C4]/50">
                      <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Videos</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="not-started">Not Started</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Video Grid */}
        <motion.div variants={itemVariants}>
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
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
          ) : filtered.length === 0 ? (
            <Card className="border-[#C4C4C4]/30">
              <CardContent className="py-16 text-center">
                <div className="h-16 w-16 rounded-full bg-[#F3CFC6]/20 flex items-center justify-center mx-auto mb-4">
                  <Video className="h-8 w-8 text-[#C4C4C4]" />
                </div>
                <p className="text-lg font-medium text-foreground">
                  {search || statusFilter !== "all"
                    ? "No videos match your filters"
                    : "No training videos available"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {search || statusFilter !== "all"
                    ? "Try adjusting your search or filter"
                    : "Check back later for new content"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((video, index) => {
                const progress = getProgressPercent(video);
                const isCompleted = video.userProgress?.isCompleted;
                const hasStarted =
                  video.userProgress && video.userProgress.watchedSec > 0;

                return (
                  <motion.div
                    key={video.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card
                      className={`overflow-hidden border-[#C4C4C4]/30 hover:shadow-lg transition-all cursor-pointer group ${
                        isCompleted ? "ring-2 ring-emerald-500/30" : ""
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
                            <Badge className="bg-emerald-500 text-white gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Completed
                            </Badge>
                          ) : hasStarted ? (
                            <Badge className="bg-amber-500 text-white">
                              In Progress
                            </Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="bg-white/90 text-black"
                            >
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
                        <h3 className="font-semibold text-foreground line-clamp-2 mb-3 group-hover:text-[#F3CFC6] transition-colors">
                          {video.name}
                        </h3>

                        {/* Progress Bar */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Progress</span>
                            <span className="font-medium">
                              {Math.round(progress)}%
                            </span>
                          </div>
                          <Progress
                            value={progress}
                            className={`h-1.5 ${isCompleted ? "bg-emerald-100" : "bg-[#C4C4C4]/20"}`}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* Video Player Modal */}
      <AnimatePresence>
        {selectedVideo && (
          <VideoPlayerModal
            video={selectedVideo}
            onClose={() => setSelectedVideo(null)}
            onProgressUpdate={fetchVideos}
          />
        )}
      </AnimatePresence>
    </>
  );
}
