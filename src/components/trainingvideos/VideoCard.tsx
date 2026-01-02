// src/components/trainingvideos/VideoCard.tsx
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Video, Play, CheckCircle, Clock } from "lucide-react";

interface VideoCardProps {
  video: {
    id: string;
    name: string;
    url: string;
    durationSec?: number | null;
    userProgress?: {
      watchedSec: number;
      isCompleted: boolean;
    };
  };
  onPlay: () => void;
}

export default function VideoCard({ video, onPlay }: VideoCardProps) {
  const progress =
    video.userProgress && video.durationSec
      ? Math.min(100, (video.userProgress.watchedSec / video.durationSec) * 100)
      : 0;

  const isCompleted = video.userProgress?.isCompleted;
  const hasStarted = video.userProgress && video.userProgress.watchedSec > 0;

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

  return (
    <Card
      className={`overflow-hidden border-[#C4C4C4]/30 hover:shadow-lg transition-all cursor-pointer group ${
        isCompleted ? "ring-2 ring-emerald-500/30" : ""
      }`}
      onClick={onPlay}
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
            <Badge className="bg-amber-500 text-white">In Progress</Badge>
          ) : (
            <Badge variant="secondary" className="bg-white/90 text-black">
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
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress
            value={progress}
            className={`h-1.5 ${isCompleted ? "bg-emerald-100" : "bg-[#C4C4C4]/20"}`}
          />
        </div>
      </CardContent>
    </Card>
  );
}
