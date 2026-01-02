// src/app/dashboard/edit-profile/professional-application/video/page.tsx
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Play,
  Pause,
  Volume2,
  VolumeX,
  CheckCircle,
  Loader2,
  ArrowRight,
  AlertTriangle,
  RotateCcw,
  Clock,
  Shield,
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace YT {
    interface PlayerOptions {
      height?: string;
      width?: string;
      videoId?: string;
      playerVars?: {
        autoplay?: 0 | 1;
        rel?: 0;
        controls?: 0 | 1;
        playsinline?: 0 | 1;
        start?: number;
        disablekb?: 0 | 1;
      };
      events?: {
        onReady?: (event: PlayerEvent) => void;
        onStateChange?: (event: OnStateChangeEvent) => void;
      };
    }

    interface Player {
      playVideo(): void;
      pauseVideo(): void;
      mute(): void;
      unMute(): void;
      isMuted(): boolean;
      getDuration(): number;
      getCurrentTime(): number;
      seekTo(seconds: number, allowSeekAhead: boolean): void;
      destroy(): void;
    }

    interface PlayerEvent {
      target: Player;
    }

    interface OnStateChangeEvent extends PlayerEvent {
      data: number;
    }

    const Player: {
      new (elementId: string | HTMLElement, options: PlayerOptions): Player;
    };

    const PlayerState: {
      UNSTARTED: number;
      ENDED: number;
      PLAYING: number;
      PAUSED: number;
      BUFFERING: number;
      CUED: number;
    };
  }

  interface Window {
    YT: typeof YT;
    onYouTubeIframeAPIReady: () => void;
  }
}
/* eslint-enable @typescript-eslint/no-namespace */

interface VideoData {
  id: string;
  name: string;
  url: string;
  durationSec: number;
  watchedSec: number;
  isCompleted: boolean;
}

interface ApplicationData {
  status: string;
  professionalId: string | null;
}

type PageStatus = "loading" | "error" | "no_application" | "ready";

const VIDEO_ALLOWED_STATUSES = [
  "VIDEO_PENDING",
  "QUIZ_PENDING",
  "QUIZ_FAILED",
  "QUIZ_PASSED",
  "ADMIN_REVIEW",
  "APPROVED",
];

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function VideoPage() {
  const playerRef = useRef<YT.Player | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const saveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const maxWatchedRef = useRef<number>(0);
  const lastValidTimeRef = useRef<number>(0);

  const [pageStatus, setPageStatus] = useState<PageStatus>("loading");
  const [video, setVideo] = useState<VideoData | null>(null);
  const [application, setApplication] = useState<ApplicationData | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [seekWarning, setSeekWarning] = useState(false);

  const { status } = useSession();
  const router = useRouter();

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/professionals/onboarding/status", {
        credentials: "include",
      });

      if (!res.ok) {
        setPageStatus("error");
        return;
      }

      const data = await res.json();

      if (!data.application) {
        setPageStatus("no_application");
        return;
      }

      if (!VIDEO_ALLOWED_STATUSES.includes(data.step)) {
        setPageStatus("no_application");
        return;
      }

      if (!data.video) {
        setPageStatus("error");
        toast.error("Onboarding video not available.");
        return;
      }

      setVideo(data.video);
      setApplication(data.application);
      setIsComplete(data.video.isCompleted);
      setCurrentTime(data.video.watchedSec);
      maxWatchedRef.current = data.video.watchedSec;
      lastValidTimeRef.current = data.video.watchedSec;
      setProgress(
        data.video.durationSec
          ? (data.video.watchedSec / data.video.durationSec) * 100
          : 0
      );
      setPageStatus("ready");
    } catch {
      toast.error("Failed to load video status.");
      setPageStatus("error");
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchStatus();
    }
  }, [status, router, fetchStatus]);

  const saveProgress = useCallback(
    async (watchedSec: number, completed: boolean) => {
      if (isSaving || (isComplete && !completed)) return;

      try {
        setIsSaving(true);
        const res = await fetch(
          "/api/professionals/onboarding/video/complete",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ watchedSec, isCompleted: completed }),
            credentials: "include",
          }
        );

        if (!res.ok && res.status !== 400) {
          console.error("Failed to save progress");
        }
      } catch {
        console.error("Save error");
      } finally {
        setIsSaving(false);
      }
    },
    [isSaving, isComplete]
  );

  const markComplete = useCallback(async () => {
    if (isComplete) return;

    const duration =
      playerRef.current?.getDuration() || video?.durationSec || 0;
    await saveProgress(Math.floor(duration), true);
    setIsComplete(true);
    toast.success("Video completed! You can now proceed to the quiz. 🎉");
  }, [isComplete, video?.durationSec, saveProgress]);

  const handleSeekAttempt = useCallback((attemptedTime: number) => {
    // Allow seeking backwards
    if (attemptedTime <= maxWatchedRef.current) {
      lastValidTimeRef.current = attemptedTime;
      return;
    }

    // Block forward seeking
    setSeekWarning(true);
    setTimeout(() => setSeekWarning(false), 3000);

    if (playerRef.current) {
      playerRef.current.seekTo(lastValidTimeRef.current, true);
    }
  }, []);

  const createPlayer = useCallback(() => {
    if (!containerRef.current || !video) return;

    const youtubeId = extractYouTubeId(video.url);
    if (!youtubeId) {
      toast.error("Invalid video URL.");
      return;
    }

    if (playerRef.current) return;

    playerRef.current = new window.YT.Player(containerRef.current, {
      height: "100%",
      width: "100%",
      videoId: youtubeId,
      playerVars: {
        autoplay: 0,
        rel: 0,
        controls: 0, // Disable default controls for seek restriction
        playsinline: 1,
        start: 0,
        disablekb: 1, // Disable keyboard controls
      },
      events: {
        onReady: () => setPlayerReady(true),
        onStateChange: (event) => {
          setIsPlaying(event.data === window.YT.PlayerState.PLAYING);
          if (event.data === window.YT.PlayerState.ENDED && !isComplete) {
            markComplete();
          }
        },
      },
    });

    // Save progress every 10 seconds
    saveIntervalRef.current = setInterval(() => {
      if (isComplete || !playerRef.current?.getCurrentTime) return;
      const current = Math.floor(playerRef.current.getCurrentTime());
      saveProgress(current, false);
    }, 10000);
  }, [video, isComplete, markComplete, saveProgress]);

  useEffect(() => {
    if (!video || pageStatus !== "ready") return;

    if (window.YT?.Player) {
      createPlayer();
      return;
    }

    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScript = document.getElementsByTagName("script")[0];
    firstScript.parentNode?.insertBefore(tag, firstScript);

    window.onYouTubeIframeAPIReady = createPlayer;

    return () => {
      if (saveIntervalRef.current) clearInterval(saveIntervalRef.current);
      if (progressIntervalRef.current)
        clearInterval(progressIntervalRef.current);
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [video, pageStatus, createPlayer]);

  useEffect(() => {
    if (!playerReady || !video?.durationSec) return;

    progressIntervalRef.current = setInterval(() => {
      if (!playerRef.current?.getCurrentTime) return;

      const current = playerRef.current.getCurrentTime();
      const duration = video.durationSec;

      // Check for forward seek attempts
      if (current > maxWatchedRef.current + 2) {
        handleSeekAttempt(current);
        return;
      }

      // Update max watched position
      if (current > maxWatchedRef.current) {
        maxWatchedRef.current = current;
      }
      lastValidTimeRef.current = current;

      const pct = (current / duration) * 100;
      setCurrentTime(Math.floor(current));
      setProgress(pct);

      // Complete at 90%
      if (pct >= 90 && !isComplete) {
        markComplete();
      }
    }, 500);

    return () => {
      if (progressIntervalRef.current)
        clearInterval(progressIntervalRef.current);
    };
  }, [
    playerReady,
    video?.durationSec,
    isComplete,
    markComplete,
    handleSeekAttempt,
  ]);

  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getNextStepUrl = (): string => {
    if (!application)
      return "/dashboard/edit-profile/professional-application/status";

    switch (application.status) {
      case "VIDEO_PENDING":
      case "QUIZ_PENDING":
      case "QUIZ_FAILED":
        return "/dashboard/edit-profile/professional-application/quiz";
      case "QUIZ_PASSED":
      case "ADMIN_REVIEW":
        return "/dashboard/edit-profile/professional-application/status";
      case "APPROVED":
        return "/dashboard";
      default:
        return "/dashboard/edit-profile/professional-application/status";
    }
  };

  const canProceed = isComplete || video?.isCompleted;

  if (status === "loading" || pageStatus === "loading") {
    return <LoadingSkeleton />;
  }

  if (pageStatus === "error") {
    return (
      <div className="p-4 max-w-4xl mx-auto">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Loading Video</AlertTitle>
          <AlertDescription>
            Unable to load the onboarding video. Please try again.
            <Button
              variant="link"
              className="p-0 h-auto ml-2"
              onClick={fetchStatus}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (pageStatus === "no_application") {
    return (
      <div className="p-4 max-w-4xl mx-auto">
        <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/30">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800 dark:text-amber-300">
            Step Not Available
          </AlertTitle>
          <AlertDescription className="text-amber-700 dark:text-amber-400">
            You must complete the application form before accessing this video.
            <Button asChild variant="link" className="p-0 h-auto ml-2">
              <Link href="/dashboard/edit-profile/professional-application">
                Go to Application →
              </Link>
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!video) return null;

  return (
    <motion.div
      className="p-4 space-y-6 max-w-4xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg border-0">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row gap-4 items-start justify-between">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="rounded-full bg-white/80 hover:bg-white"
            >
              <Link href="/dashboard/edit-profile/professional-application/status">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Status
              </Link>
            </Button>

            <div className="text-center flex-1">
              <Badge className="bg-black/20 text-black mb-2">Step 2 of 3</Badge>
              <CardTitle className="text-xl text-black">
                Watch Onboarding Video
              </CardTitle>
            </div>

            <div className="w-32 hidden md:block" />
          </div>
        </CardHeader>
      </Card>

      {/* Seek Warning Toast */}
      {seekWarning && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50"
        >
          <Alert className="bg-amber-500 text-black border-amber-600 shadow-lg">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="font-medium">
              You can rewind but cannot skip ahead
            </AlertDescription>
          </Alert>
        </motion.div>
      )}

      {/* Already Completed Notice */}
      {canProceed && (
        <Alert className="border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30">
          <CheckCircle className="h-5 w-5 text-emerald-600" />
          <AlertTitle className="text-emerald-800 dark:text-emerald-300">
            Video Completed!
          </AlertTitle>
          <AlertDescription className="text-emerald-700 dark:text-emerald-400">
            Great job! You&apos;ve completed this video. You may rewatch it or
            proceed to the quiz.
          </AlertDescription>
        </Alert>
      )}

      {/* Video Player Card */}
      <Card className="shadow-xl overflow-hidden border-0">
        <CardContent className="p-0">
          {/* Video Container */}
          <div className="relative bg-black aspect-video">
            <div ref={containerRef} className="w-full h-full" />

            {/* Loading State */}
            {!playerReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-900 to-black">
                <div className="text-white text-center">
                  <Loader2 className="h-14 w-14 animate-spin mx-auto mb-4" />
                  <p className="text-lg font-medium">Loading video player...</p>
                  <p className="text-sm text-zinc-400 mt-1">Please wait</p>
                </div>
              </div>
            )}

            {/* Seek Restriction Notice */}
            {!canProceed && playerReady && (
              <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1.5 rounded-full text-xs flex items-center gap-2">
                <Shield className="h-3 w-3" />
                Seeking restricted
              </div>
            )}

            {/* Custom Controls */}
            <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black via-black/70 to-transparent">
              {/* Progress Bar */}
              <div className="mb-4 relative group">
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#F3CFC6] transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                {/* Max watched indicator */}
                {!canProceed && (
                  <div
                    className="absolute top-0 h-2 w-1 bg-white/60 rounded-full"
                    style={{
                      left: `${(maxWatchedRef.current / video.durationSec) * 100}%`,
                    }}
                  />
                )}
              </div>

              <div className="flex items-center justify-between">
                {/* Left Controls */}
                <div className="flex items-center gap-3">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-white hover:bg-white/20 rounded-full h-12 w-12"
                    onClick={() =>
                      isPlaying
                        ? playerRef.current?.pauseVideo()
                        : playerRef.current?.playVideo()
                    }
                    disabled={!playerReady}
                  >
                    {isPlaying ? (
                      <Pause className="h-6 w-6" />
                    ) : (
                      <Play className="h-6 w-6 ml-0.5" />
                    )}
                  </Button>

                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-white hover:bg-white/20 rounded-full h-10 w-10"
                    onClick={() => {
                      if (!playerRef.current) return;
                      if (playerRef.current.isMuted()) {
                        playerRef.current.unMute();
                        setIsMuted(false);
                      } else {
                        playerRef.current.mute();
                        setIsMuted(true);
                      }
                    }}
                    disabled={!playerReady}
                  >
                    {isMuted ? (
                      <VolumeX className="h-5 w-5" />
                    ) : (
                      <Volume2 className="h-5 w-5" />
                    )}
                  </Button>

                  <div className="text-white font-mono text-sm flex items-center gap-2">
                    <Clock className="h-4 w-4 opacity-60" />
                    {formatTime(currentTime)} / {formatTime(video.durationSec)}
                  </div>
                </div>

                {/* Right Status */}
                <div className="flex items-center gap-3">
                  {isSaving && (
                    <div className="text-white/60 text-xs flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Saving...
                    </div>
                  )}

                  {canProceed && (
                    <Badge className="bg-emerald-500 text-white gap-1.5 py-1">
                      <CheckCircle className="h-3.5 w-3.5" />
                      Completed
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Video Info & Actions */}
          <div className="p-6 space-y-5 bg-white dark:bg-zinc-900">
            <div>
              <h3 className="text-xl font-semibold text-foreground">
                {video.name}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {canProceed
                  ? "You've completed this step. Proceed to the quiz when ready."
                  : "Watch at least 90% of the video to unlock the next step."}
              </p>
            </div>

            {/* Progress Stats */}
            {!canProceed && (
              <div className="bg-muted/50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-3 w-3 rounded-full ${
                        progress >= 90 ? "bg-emerald-500" : "bg-amber-500"
                      }`}
                    />
                    <span className="font-medium">
                      {Math.round(progress)}% complete
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {Math.max(
                      0,
                      Math.ceil(video.durationSec * 0.9 - currentTime)
                    )}{" "}
                    seconds to 90%
                  </span>
                </div>
                <Progress value={progress} className="h-2" />

                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-3">
                  <RotateCcw className="h-3 w-3" />
                  You can rewind to review content, but cannot skip ahead
                </div>
              </div>
            )}

            {/* Action Button */}
            <Button
              size="lg"
              className={`w-full rounded-xl text-base font-medium ${
                canProceed
                  ? "bg-[#F3CFC6] hover:bg-[#e5b8ad] text-black"
                  : "bg-muted text-muted-foreground"
              }`}
              onClick={() => router.push(getNextStepUrl())}
              disabled={!canProceed}
            >
              {canProceed ? (
                <>
                  Proceed to Quiz
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              ) : (
                `Watch ${90 - Math.round(progress)}% more to continue`
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="p-4 space-y-6 max-w-4xl mx-auto">
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg border-0">
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 items-start justify-between">
            <Skeleton className="h-9 w-32 rounded-full" />
            <div className="text-center flex-1 space-y-2">
              <Skeleton className="h-5 w-20 mx-auto" />
              <Skeleton className="h-7 w-48 mx-auto" />
            </div>
            <div className="w-32 hidden md:block" />
          </div>
        </CardHeader>
      </Card>

      <Card className="shadow-xl overflow-hidden border-0">
        <Skeleton className="aspect-video w-full" />
        <div className="p-6 space-y-5">
          <Skeleton className="h-7 w-80" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </Card>
    </div>
  );
}

function extractYouTubeId(url: string): string | null {
  const regex =
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = url.match(regex);
  return match?.[1] ?? null;
}
