"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Video } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import VideoCard from "@/components/trainingvideos/VideoCard";
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
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function TrainingVideosPage() {
  const [videos, setVideos] = useState<TrainingVideo[]>([]);
  const [filtered, setFiltered] = useState<TrainingVideo[]>([]);
  const [search, setSearch] = useState("");
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
    const lower = search.toLowerCase();
    setFiltered(videos.filter((v) => v.name.toLowerCase().includes(lower)));
  }, [search, videos]);

  const openVideo = (video: TrainingVideo) => {
    setSelectedVideo(video);
  };

  const closeModal = () => setSelectedVideo(null);

  return (
    <>
      <motion.div
        className="p-4 space-y-6 max-w-7xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-black dark:text-white">
              Training Videos
            </CardTitle>
            <p className="text-sm opacity-80">Learn how to use the platform</p>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white" />
              <Input
                placeholder="Search videos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 border-[#F3CFC6] text-black dark:text-white"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-black dark:text-white">
              <Video className="mr-2 h-6 w-6 text-[#F3CFC6]" />
              All Videos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] pr-4">
              {loading ? (
                <div className="space-y-4">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton
                      key={i}
                      className="h-32 w-full rounded-lg bg-[#C4C4C4]/30"
                    />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-center text-[#C4C4C4] py-8">
                  No videos found
                </p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {filtered.map((video) => (
                    <VideoCard
                      key={video.id}
                      video={video}
                      onPlay={() => openVideo(video)}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </motion.div>

      <AnimatePresence>
        {selectedVideo && (
          <VideoPlayerModal
            video={selectedVideo}
            onClose={closeModal}
            onProgressUpdate={fetchVideos}
          />
        )}
      </AnimatePresence>
    </>
  );
}
