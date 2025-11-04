"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Video, Search, Plus, Edit, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { format } from "date-fns";

interface TrainingVideo {
  id: string;
  name: string;
  url: string;
  durationSec?: number | null;
  isActive: boolean;
  createdAt: string;
}

export default function TrainingVideosPage() {
  const [videos, setVideos] = useState<TrainingVideo[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

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
      toast.success(`Video ${video.isActive ? "unpublished" : "published"}`);
      fetchVideos();
    } catch {
      toast.error("Failed to update status");
    }
  };

  const deleteVideo = async (id: string) => {
    if (!confirm("Delete this video permanently?")) return;
    try {
      const res = await fetch(`/api/trainingvideos/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      toast.success("Video deleted");
      fetchVideos();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const filtered = videos.filter((v) =>
    v.name.toLowerCase().includes(search.toLowerCase())
  );

  const formatDuration = (sec?: number | null) =>
    sec
      ? `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, "0")}`
      : "—";

  return (
    <motion.div
      className="space-y-6 max-w-7xl mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Header */}
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
        <CardHeader className="flex justify-between items-center">
          <CardTitle className="flex items-center text-2xl text-black dark:text-white">
            <Video className="mr-2 h-6 w-6" /> Training Videos
          </CardTitle>
          <Button asChild className="bg-white text-black hover:bg-gray-100">
            <Link href="/admin/dashboard/training-videos/create">
              <Plus className="mr-2 h-4 w-4" /> Upload Video
            </Link>
          </Button>
        </CardHeader>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#C4C4C4]" />
        <Input
          placeholder="Search videos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 border-[#C4C4C4] focus:ring-[#F3CFC6] dark:bg-black dark:text-white"
        />
      </div>

      {/* List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="text-center py-8 text-[#C4C4C4]">Loading videos...</p>
          ) : filtered.length === 0 ? (
            <p className="text-center py-8 text-[#C4C4C4]">
              {search
                ? "No videos match your search."
                : "No training videos yet."}
            </p>
          ) : (
            <div className="divide-y divide-[#C4C4C4]/20">
              {filtered.map((video) => (
                <div
                  key={video.id}
                  className="p-4 hover:bg-[#F3CFC6]/5 dark:hover:bg-[#C4C4C4]/10 transition-colors flex justify-between items-center"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-gradient-to-br from-[#F3CFC6] to-[#C4C4C4] rounded-lg flex items-center justify-center">
                      <Video className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-black dark:text-white">
                        {video.name}
                      </p>
                      <p className="text-sm text-[#C4C4C4]">
                        {formatDuration(video.durationSec)} •{" "}
                        {format(new Date(video.createdAt), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant={video.isActive ? "default" : "outline"}
                      onClick={() => toggleActive(video.id)}
                      className={
                        video.isActive
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                          : ""
                      }
                    >
                      {video.isActive ? "Published" : "Draft"}
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link
                        href={`/admin/dashboard/training-videos/${video.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteVideo(video.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
