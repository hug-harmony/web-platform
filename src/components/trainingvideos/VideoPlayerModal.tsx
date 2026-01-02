// src/components/trainingvideos/VideoPlayerModal.tsx
"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  CheckCircle,
  Loader2,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

interface VideoPlayerModalProps {
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
  onClose: () => void;
  onProgressUpdate: () => void;
  restrictSeeking?: boolean; // For onboarding videos
}

declare global {
  interface Window {
    YT: typeof YT;
    onYouTubeIframeAPIReady: () => void;
  }
}

export default function VideoPlayerModal({
  video,
  onClose,
  onProgressUpdate,
  restrictSeeking = false,
}: VideoPlayerModalProps) {
  const playerRef = useRef<YT.Player | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const saveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const maxWatchedRef = useRef<number>(video.userProgress?.watchedSec || 0);
  const lastValidTimeRef = useRef<number>(video.userProgress?.watchedSec || 0);

  const [playerReady, setPlayerReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(
    video.userProgress?.watchedSec || 0
  );
  const [progress, setProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(
    video.userProgress?.isCompleted || false
  );
  const [isSaving, setIsSaving] = useState(false);
  const [seekWarning, setSeekWarning] = useState(false);

  const extractYouTubeId = (url: string): string | null => {
    const regex =
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const match = url.match(regex);
    return match?.[1] ?? null;
  };

  const isYouTube = extractYouTubeId(video.url) !== null;
  const isDirectVideo =
    video.url.endsWith(".mp4") ||
    video.url.endsWith(".webm") ||
    video.url.includes("s3.amazonaws.com");

  const saveProgress = useCallback(
    async (watchedSec: number, completed: boolean) => {
      if (isSaving) return;

      try {
        setIsSaving(true);
        await fetch(`/api/trainingvideos/${video.id}/watch`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ watchedSec, isCompleted: completed }),
          credentials: "include",
        });

        if (completed && !isCompleted) {
          setIsCompleted(true);
          toast.success("Video completed! 🎉");
          onProgressUpdate();
        }
      } catch (error) {
        console.error("Failed to save progress:", error);
      } finally {
        setIsSaving(false);
      }
    },
    [video.id, isCompleted, isSaving, onProgressUpdate]
  );

  const handleSeekAttempt = useCallback(
    (attemptedTime: number) => {
      if (!restrictSeeking) return attemptedTime;

      // Allow seeking backwards freely
      if (attemptedTime <= maxWatchedRef.current) {
        lastValidTimeRef.current = attemptedTime;
        return attemptedTime;
      }

      // Trying to seek forward beyond watched content
      setSeekWarning(true);
      setTimeout(() => setSeekWarning(false), 3000);

      // Reset to last valid position
      if (playerRef.current) {
        playerRef.current.seekTo(lastValidTimeRef.current, true);
      }

      return lastValidTimeRef.current;
    },
    [restrictSeeking]
  );

  // YouTube Player Setup
  const createYouTubePlayer = useCallback(() => {
    if (!containerRef.current || !isYouTube) return;

    const youtubeId = extractYouTubeId(video.url);
    if (!youtubeId || playerRef.current) return;

    playerRef.current = new window.YT.Player(containerRef.current, {
      height: "100%",
      width: "100%",
      videoId: youtubeId,
      playerVars: {
        autoplay: 0,
        rel: 0,
        controls: restrictSeeking ? 0 : 1,
        playsinline: 1,
        start: Math.floor(video.userProgress?.watchedSec || 0),
        disablekb: restrictSeeking ? 1 : 0,
      },
      events: {
        onReady: () => setPlayerReady(true),
        onStateChange: (event) => {
          setIsPlaying(event.data === window.YT.PlayerState.PLAYING);

          if (event.data === window.YT.PlayerState.ENDED && !isCompleted) {
            const duration = video.durationSec || 0;
            saveProgress(duration, true);
          }
        },
      },
    });
  }, [video, isYouTube, isCompleted, restrictSeeking, saveProgress]);

  // Load YouTube API
  useEffect(() => {
    if (!isYouTube) return;

    if (window.YT?.Player) {
      createYouTubePlayer();
      return;
    }

    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScript = document.getElementsByTagName("script")[0];
    firstScript.parentNode?.insertBefore(tag, firstScript);

    window.onYouTubeIframeAPIReady = createYouTubePlayer;

    return () => {
      if (progressIntervalRef.current)
        clearInterval(progressIntervalRef.current);
      if (saveIntervalRef.current) clearInterval(saveIntervalRef.current);
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [isYouTube, createYouTubePlayer]);

  // Progress tracking for YouTube
  useEffect(() => {
    if (!playerReady || !isYouTube || !video.durationSec) return;

    progressIntervalRef.current = setInterval(() => {
      if (!playerRef.current?.getCurrentTime) return;

      const current = playerRef.current.getCurrentTime();
      const duration = video.durationSec!;

      // Check for seek attempts
      if (restrictSeeking && current > maxWatchedRef.current + 2) {
        handleSeekAttempt(current);
        return;
      }

      // Update max watched
      if (current > maxWatchedRef.current) {
        maxWatchedRef.current = current;
      }
      lastValidTimeRef.current = current;

      const pct = (current / duration) * 100;
      setCurrentTime(Math.floor(current));
      setProgress(pct);

      // Mark complete at 90%
      if (pct >= 90 && !isCompleted) {
        saveProgress(Math.floor(current), true);
      }
    }, 1000);

    // Auto-save every 10 seconds
    saveIntervalRef.current = setInterval(() => {
      if (isCompleted || !playerRef.current?.getCurrentTime) return;
      const current = Math.floor(playerRef.current.getCurrentTime());
      saveProgress(current, false);
    }, 10000);

    return () => {
      if (progressIntervalRef.current)
        clearInterval(progressIntervalRef.current);
      if (saveIntervalRef.current) clearInterval(saveIntervalRef.current);
    };
  }, [
    playerReady,
    isYouTube,
    video.durationSec,
    isCompleted,
    restrictSeeking,
    handleSeekAttempt,
    saveProgress,
  ]);

  // HTML5 Video handlers
  const handleVideoTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const videoEl = e.currentTarget;
    const current = videoEl.currentTime;
    const duration = video.durationSec || videoEl.duration;

    if (restrictSeeking && current > maxWatchedRef.current + 2) {
      videoEl.currentTime = lastValidTimeRef.current;
      setSeekWarning(true);
      setTimeout(() => setSeekWarning(false), 3000);
      return;
    }

    if (current > maxWatchedRef.current) {
      maxWatchedRef.current = current;
    }
    lastValidTimeRef.current = current;

    const pct = (current / duration) * 100;
    setCurrentTime(Math.floor(current));
    setProgress(pct);

    if (pct >= 90 && !isCompleted) {
      saveProgress(Math.floor(current), true);
    }
  };

  const handleVideoSeeking = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    if (!restrictSeeking) return;

    const videoEl = e.currentTarget;
    if (videoEl.currentTime > maxWatchedRef.current + 1) {
      videoEl.currentTime = lastValidTimeRef.current;
      setSeekWarning(true);
      setTimeout(() => setSeekWarning(false), 3000);
    }
  };

  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const togglePlay = () => {
    if (isYouTube && playerRef.current) {
      if (isPlaying) {
        playerRef.current.pauseVideo();
      } else {
        playerRef.current.playVideo();
      }
    }
  };

  const toggleMute = () => {
    if (isYouTube && playerRef.current) {
      if (playerRef.current.isMuted()) {
        playerRef.current.unMute();
        setIsMuted(false);
      } else {
        playerRef.current.mute();
        setIsMuted(true);
      }
    }
  };

  const handleClose = async () => {
    // Save progress before closing
    if (!isCompleted && currentTime > 0) {
      await saveProgress(currentTime, false);
    }
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative w-full max-w-5xl bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClose}
          className="absolute top-4 right-4 z-20 bg-black/50 hover:bg-black/70 text-white rounded-full"
        >
          <X className="h-5 w-5" />
        </Button>

        {/* Seek Warning */}
        {seekWarning && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-amber-500 text-black px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg"
          >
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">
              You can only rewind, not skip ahead
            </span>
          </motion.div>
        )}

        {/* Video Container */}
        <div className="relative aspect-video bg-black">
          {isYouTube ? (
            <>
              <div ref={containerRef} className="w-full h-full" />
              {!playerReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-black">
                  <div className="text-center text-white">
                    <Loader2 className="h-12 w-12 animate-spin mx-auto mb-3" />
                    <p>Loading video...</p>
                  </div>
                </div>
              )}
            </>
          ) : isDirectVideo ? (
            <video
              src={video.url}
              className="w-full h-full"
              controls={!restrictSeeking}
              controlsList={restrictSeeking ? "nodownload nofullscreen" : ""}
              onTimeUpdate={handleVideoTimeUpdate}
              onSeeking={handleVideoSeeking}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onLoadedMetadata={() => setPlayerReady(true)}
              onEnded={() => {
                if (!isCompleted) {
                  saveProgress(video.durationSec || 0, true);
                }
              }}
            />
          ) : (
            <iframe
              src={video.url}
              className="w-full h-full"
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          )}

          {/* Custom Controls Overlay (for restricted mode) */}
          {restrictSeeking && playerReady && isYouTube && (
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
              {/* Progress Bar */}
              <div className="mb-4 relative group">
                <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#F3CFC6] transition-all"
                    style={{ width: `${progress}%` }}
                  />
                  {/* Max watched indicator */}
                  <div
                    className="absolute top-0 h-full w-0.5 bg-white/50"
                    style={{
                      left: `${(maxWatchedRef.current / (video.durationSec || 1)) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={togglePlay}
                    className="text-white hover:bg-white/20 rounded-full h-10 w-10"
                  >
                    {isPlaying ? (
                      <Pause className="h-5 w-5" />
                    ) : (
                      <Play className="h-5 w-5 ml-0.5" />
                    )}
                  </Button>

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={toggleMute}
                    className="text-white hover:bg-white/20 rounded-full h-10 w-10"
                  >
                    {isMuted ? (
                      <VolumeX className="h-5 w-5" />
                    ) : (
                      <Volume2 className="h-5 w-5" />
                    )}
                  </Button>

                  <span className="text-white text-sm font-mono">
                    {formatTime(currentTime)} /{" "}
                    {formatTime(video.durationSec || 0)}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {isCompleted && (
                    <Badge className="bg-emerald-500 text-white gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Completed
                    </Badge>
                  )}

                  {isSaving && (
                    <div className="text-white/60 text-xs flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Saving...
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Video Info */}
        <div className="p-5 bg-zinc-900">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white">{video.name}</h2>
              <div className="flex items-center gap-4 mt-2 text-sm text-zinc-400">
                <span>{formatTime(video.durationSec || 0)}</span>
                <span>•</span>
                <span>{Math.round(progress)}% watched</span>
              </div>
            </div>

            {isCompleted && (
              <div className="flex items-center gap-2 bg-emerald-500/20 text-emerald-400 px-3 py-2 rounded-lg">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Completed</span>
              </div>
            )}
          </div>

          {/* Progress indicator */}
          <div className="mt-4">
            <Progress value={progress} className="h-2 bg-zinc-700" />
          </div>

          {restrictSeeking && !isCompleted && (
            <p className="text-xs text-zinc-500 mt-3 flex items-center gap-2">
              <RotateCcw className="h-3 w-3" />
              You can rewind but not skip ahead. Watch at least 90% to complete.
            </p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
