// src/app/admin/dashboard/training-videos/page.tsx
"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Video,
  Search,
  Plus,
  Edit,
  Trash2,
  Play,
  Clock,
  Calendar,
  Eye,
  EyeOff,
  MoreVertical,
  Filter,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";

interface TrainingVideo {
  id: string;
  name: string;
  url: string;
  durationSec?: number | null;
  isActive: boolean;
  isProOnboarding: boolean;
  createdAt: string;
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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "draft">(
    "all"
  );
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/trainingvideos?admin=true", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load videos");
      const data = await res.json();
      setVideos(data);
    } catch {
      toast.error("Failed to load videos");
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (id: string) => {
    const video = videos.find((v) => v.id === id);
    if (!video) return;

    try {
      const res = await fetch(`/api/trainingvideos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !video.isActive }),
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      toast.success(
        video.isActive ? "Video unpublished" : "Video published successfully"
      );
      fetchVideos();
    } catch {
      toast.error("Failed to update status");
    }
  };

  const deleteVideo = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/trainingvideos/${deleteId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      toast.success("Video deleted successfully");
      fetchVideos();
    } catch {
      toast.error("Failed to delete video");
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const filtered = videos.filter((v) => {
    const matchesSearch = v.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && v.isActive) ||
      (statusFilter === "draft" && !v.isActive);
    return matchesSearch && matchesStatus;
  });

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

  const stats = {
    total: videos.length,
    published: videos.filter((v) => v.isActive).length,
    drafts: videos.filter((v) => !v.isActive).length,
  };

  return (
    <motion.div
      className="space-y-6 max-w-7xl mx-auto p-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg border-0">
          <CardHeader className="pb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center text-2xl text-black">
                  <Video className="mr-3 h-7 w-7" />
                  Training Videos
                </CardTitle>
                <p className="text-sm text-black/70 mt-1">
                  Manage training content for professionals
                </p>
              </div>
              <Button
                asChild
                className="bg-black hover:bg-black/80 text-white shadow-lg"
              >
                <Link href="/admin/dashboard/training-videos/create">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload New Video
                </Link>
              </Button>
            </div>
          </CardHeader>
        </Card>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <Card className="bg-white dark:bg-zinc-900 border-[#C4C4C4]/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Videos</p>
                <p className="text-2xl font-bold text-black dark:text-white">
                  {stats.total}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-[#F3CFC6]/20 flex items-center justify-center">
                <Video className="h-6 w-6 text-[#F3CFC6]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-zinc-900 border-[#C4C4C4]/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Published</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {stats.published}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Eye className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-zinc-900 border-[#C4C4C4]/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Drafts</p>
                <p className="text-2xl font-bold text-amber-600">
                  {stats.drafts}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <EyeOff className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
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
                  placeholder="Search videos by name..."
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
                    setStatusFilter(v as "all" | "active" | "draft")
                  }
                >
                  <SelectTrigger className="w-[140px] border-[#C4C4C4]/50">
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Videos</SelectItem>
                    <SelectItem value="active">Published</SelectItem>
                    <SelectItem value="draft">Drafts</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Video List */}
      <motion.div variants={itemVariants}>
        <Card className="border-[#C4C4C4]/30 overflow-hidden">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-16 w-24 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <Skeleton className="h-8 w-20" />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                <div className="h-16 w-16 rounded-full bg-[#F3CFC6]/20 flex items-center justify-center mx-auto mb-4">
                  <Video className="h-8 w-8 text-[#C4C4C4]" />
                </div>
                <p className="text-lg font-medium text-foreground">
                  {search || statusFilter !== "all"
                    ? "No videos match your filters"
                    : "No training videos yet"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {search || statusFilter !== "all"
                    ? "Try adjusting your search or filter"
                    : "Upload your first training video to get started"}
                </p>
                {!search && statusFilter === "all" && (
                  <Button
                    asChild
                    className="mt-4 bg-[#F3CFC6] text-black hover:bg-[#e5b8ad]"
                  >
                    <Link href="/admin/dashboard/training-videos/create">
                      <Plus className="mr-2 h-4 w-4" />
                      Upload Video
                    </Link>
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-[#C4C4C4]/20">
                {filtered.map((video, index) => (
                  <motion.div
                    key={video.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 hover:bg-[#F3CFC6]/5 dark:hover:bg-zinc-800/50 transition-colors"
                  >
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      {/* Thumbnail */}
                      <div className="relative h-20 w-32 bg-gradient-to-br from-[#F3CFC6] to-[#C4C4C4] rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden group">
                        <Video className="h-8 w-8 text-white" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Play className="h-8 w-8 text-white" />
                        </div>
                        {video.isProOnboarding && (
                          <Badge className="absolute top-1 left-1 bg-purple-600 text-[10px] px-1.5 py-0.5">
                            Onboarding
                          </Badge>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2">
                          <h3 className="font-semibold text-foreground truncate">
                            {video.name}
                          </h3>
                          <Badge
                            variant={video.isActive ? "default" : "secondary"}
                            className={
                              video.isActive
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                            }
                          >
                            {video.isActive ? "Published" : "Draft"}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            {formatDuration(video.durationSec)}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            {format(new Date(video.createdAt), "MMM d, yyyy")}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleActive(video.id)}
                          className={
                            video.isActive
                              ? "border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                              : "border-amber-300 text-amber-700 hover:bg-amber-50"
                          }
                        >
                          {video.isActive ? (
                            <>
                              <EyeOff className="h-4 w-4 mr-1.5" />
                              Unpublish
                            </>
                          ) : (
                            <>
                              <Eye className="h-4 w-4 mr-1.5" />
                              Publish
                            </>
                          )}
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link
                                href={`/admin/dashboard/training-videos/${video.id}`}
                                className="flex items-center"
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Video
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => window.open(video.url, "_blank")}
                            >
                              <Play className="h-4 w-4 mr-2" />
                              Preview
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeleteId(video.id)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Training Video?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The video will be permanently
              removed from the platform and all user progress will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteVideo}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? "Deleting..." : "Delete Video"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
