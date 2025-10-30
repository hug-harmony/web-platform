/* eslint-disable @typescript-eslint/no-explicit-any */
// app/admin/dashboard/training-videos/page.tsx
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

export default function TrainingVideosPage() {
  const [videos, setVideos] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    setLoading(true);
    const res = await fetch("/api/trainingvideos?admin=true");
    const data = await res.json();
    setVideos(data);
    setLoading(false);
  };

  const toggleActive = async (id: string) => {
    const res = await fetch(`/api/trainingvideos/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        isActive: !videos.find((v) => v.id === id)?.isActive,
      }),
      headers: { "Content-Type": "application/json" },
    });
    if (res.ok) {
      toast.success("Status updated");
      fetchVideos();
    }
  };

  const deleteVideo = async (id: string) => {
    if (!confirm("Delete permanently?")) return;
    const res = await fetch(`/api/trainingvideos/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Deleted");
      fetchVideos();
    }
  };

  const filtered = videos.filter((v) =>
    v.name.toLowerCase().includes(search.toLowerCase())
  );

  const formatDuration = (sec?: number) =>
    sec
      ? `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, "0")}`
      : "—";

  return (
    <motion.div
      className="space-y-6 max-w-7xl mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
        <CardHeader className="flex justify-between items-center">
          <CardTitle className="flex items-center text-2xl">
            <Video className="mr-2" /> Training Videos
          </CardTitle>
          <Button asChild>
            <Link href="/admin/dashboard/training-videos/create">
              <Plus className="mr-2 h-4 w-4" /> Upload Video
            </Link>
          </Button>
        </CardHeader>
      </Card>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
        <Input
          placeholder="Search videos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="text-center py-8">Loading...</p>
          ) : filtered.length === 0 ? (
            <p className="text-center py-8 text-gray-500">No videos</p>
          ) : (
            <div className="divide-y">
              {filtered.map((video) => (
                <div
                  key={video.id}
                  className="p-4 hover:bg-gray-50 flex justify-between items-center"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-gradient-to-br from-[#F3CFC6] to-[#C4C4C4] rounded-lg flex-center">
                      <Video className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="font-medium">{video.name}</p>
                      <p className="text-sm text-gray-500">
                        {formatDuration(video.durationSec)} •{" "}
                        {format(new Date(video.createdAt), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={video.isActive ? "default" : "outline"}
                      onClick={() => toggleActive(video.id)}
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
