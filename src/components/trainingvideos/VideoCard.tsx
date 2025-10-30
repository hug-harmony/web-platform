// components/VideoCard.tsx
import { Play, Clock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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
  const formatDuration = (sec?: number | null) => {
    if (!sec) return "—";
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const watched = video.userProgress?.watchedSec || 0;
  const total = video.durationSec || 1;
  const progress = (watched / total) * 100;
  const isCompleted = video.userProgress?.isCompleted || progress >= 100;

  return (
    <Card
      className="overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-200 group"
      onClick={onPlay}
    >
      {/* Thumbnail */}
      <div className="relative h-48 bg-gradient-to-br from-[#F3CFC6] to-[#C4C4C4] flex items-center justify-center">
        <Play className="h-16 w-16 text-white opacity-80 group-hover:opacity-100 transition-opacity" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Button
            size="lg"
            className="bg-white/20 backdrop-blur-sm hover:bg-white/30 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onPlay();
            }}
          >
            <Play className="h-8 w-8 text-white" />
          </Button>
        </div>

        {/* Progress Overlay on Thumbnail */}
        {watched > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
            <div
              className="h-full bg-[#F3CFC6] transition-all duration-500"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-2">
        <h3 className="font-semibold text-black dark:text-white line-clamp-2 leading-tight">
          {video.name}
        </h3>

        <div className="flex items-center justify-between text-sm text-[#C4C4C4]">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDuration(video.durationSec)}
          </span>

          {isCompleted ? (
            <span className="flex items-center gap-1 text-green-600 font-medium">
              <CheckCircle className="h-3.5 w-3.5" />
              Completed
            </span>
          ) : watched > 0 ? (
            <span className="text-xs font-medium">
              {Math.round(progress)}% watched
            </span>
          ) : (
            <span className="text-xs text-[#C4C4C4]/70">Not started</span>
          )}
        </div>

        {/* Progress Bar Below */}
        {video.durationSec && (
          <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#F3CFC6] to-[#E8A8A2] transition-all duration-500"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        )}
      </div>
    </Card>
  );
}
