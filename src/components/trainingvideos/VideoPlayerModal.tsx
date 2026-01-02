import { useState, useEffect, useRef, useCallback } from "react";
import { X, Play, Pause } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface VideoPlayerModalProps {
  video: {
    id: string;
    name: string;
    url: string;
    durationSec?: number | null;
    userProgress?: { watchedSec: number; isCompleted: boolean };
  };
  onClose: () => void;
  onProgressUpdate: () => void;
}

export default function VideoPlayerModal({
  video,
  onClose,
  onProgressUpdate,
}: VideoPlayerModalProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const videoRef = useRef<HTMLIFrameElement | HTMLVideoElement | null>(null);

  const isYouTube =
    video.url.includes("youtube.com") || video.url.includes("youtu.be");
  const youtubeId = isYouTube
    ? video.url.split("v=")[1]?.split("&")[0] ||
      video.url.split("/").pop()?.split("?")[0]
    : null;

  const saveProgress = useCallback(
    async (watchedSec: number) => {
      const response = await fetch(`/api/trainingvideos/${video.id}/watch`, {
        method: "POST",
        body: JSON.stringify({ watchedSec }),
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        onProgressUpdate();
      }
    },
    [video.id, onProgressUpdate]
  );

  useEffect(() => {
    if (video.userProgress?.watchedSec) {
      setCurrentTime(video.userProgress.watchedSec);
    }
  }, [video.userProgress]);

  useEffect(() => {
    const durationSec = video.durationSec;

    const interval = setInterval(() => {
      if (isPlaying && currentTime < (durationSec || Infinity)) {
        const newTime = currentTime + 1;
        setCurrentTime(newTime);
        saveProgress(newTime);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, currentTime, video.durationSec, saveProgress]);

  const togglePlay = () => setIsPlaying(!isPlaying);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black">
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
            onClick={onClose}
          >
            <X className="h-6 w-6" />
          </Button>

          <div className="aspect-video bg-black">
            {isYouTube ? (
              <iframe
                ref={videoRef as React.RefObject<HTMLIFrameElement>}
                src={`https://www.youtube.com/embed/${youtubeId}?start=${currentTime}&autoplay=1&rel=0`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            ) : (
              <video
                ref={videoRef as React.RefObject<HTMLVideoElement>}
                src={video.url}
                controls
                autoPlay
                className="w-full h-full"
                onTimeUpdate={(e) => {
                  const target = e.target as HTMLVideoElement;
                  setCurrentTime(Math.floor(target.currentTime));
                  saveProgress(Math.floor(target.currentTime));
                }}
              />
            )}
          </div>

          <div className="p-6 bg-gradient-to-t from-black/80 to-transparent absolute bottom-0 left-0 right-0">
            <h3 className="text-xl font-bold text-white mb-2">{video.name}</h3>
            <div className="flex items-center gap-4 text-white">
              <Button
                size="sm"
                variant="secondary"
                onClick={togglePlay}
                className="flex items-center gap-2"
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {isPlaying ? "Pause" : "Play"}
              </Button>
              <span className="text-sm">
                {Math.floor(currentTime / 60)}:
                {(currentTime % 60).toString().padStart(2, "0")} /{" "}
                {video.durationSec
                  ? `${Math.floor(video.durationSec / 60)}:${(video.durationSec % 60).toString().padStart(2, "0")}`
                  : "—"}
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
