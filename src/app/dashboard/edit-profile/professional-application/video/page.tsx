// app/dashboard/edit-profile/professional-application/video/page.tsx
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Play,
  Pause,
  Volume2,
  VolumeX,
  CheckCircle,
  Loader2,
  ArrowRight,
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
        modestbranding?: 1;
        rel?: 0;
        start?: number;
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

// Statuses that allow video viewing
const VIDEO_ALLOWED_STATUSES = [
  "VIDEO_PENDING",
  "QUIZ_PENDING",
  "QUIZ_FAILED",
  "QUIZ_PASSED",
  "ADMIN_REVIEW",
];

export default function VideoPage() {
  const playerRef = useRef<YT.Player | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

  const { status } = useSession();
  const router = useRouter();

  // Fetch video status
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

      // No application exists - redirect to application form
      if (!data.application || data.step === "FORM") {
        setPageStatus("no_application");
        return;
      }

      // Check if user can view video (not approved/rejected/suspended)
      if (!VIDEO_ALLOWED_STATUSES.includes(data.step)) {
        // If approved, they can still view but we'll show a message
        if (data.step === "APPROVED") {
          // Allow viewing even if approved
        } else if (data.step === "REJECTED" || data.step === "SUSPENDED") {
          setPageStatus("no_application");
          return;
        }
      }

      // If no video data, show error
      if (!data.video) {
        setPageStatus("error");
        toast.error("Video not found");
        return;
      }

      setVideo(data.video);
      setApplication(data.application);
      setIsComplete(data.video?.isCompleted || false);
      setCurrentTime(data.video?.watchedSec || 0);
      setProgress(
        data.video?.durationSec
          ? (data.video.watchedSec / data.video.durationSec) * 100
          : 0
      );
      setPageStatus("ready");
    } catch {
      toast.error("Failed to load video status");
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

  // Save progress to server
  const saveProgress = useCallback(
    async (watchedSec: number, completed: boolean) => {
      if (isSaving) return;

      // Only save if video is not already completed or if we're marking it complete
      if (isComplete && !completed) return;

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

        if (!res.ok) {
          const data = await res.json();
          // Ignore "Invalid state" errors for rewatching
          if (data.error !== "Invalid state") {
            console.error("Save progress error:", data.error);
          }
        }
      } catch {
        console.error("Failed to save progress");
      } finally {
        setIsSaving(false);
      }
    },
    [isSaving, isComplete]
  );

  // Mark video as complete
  const markComplete = useCallback(async () => {
    if (isComplete) return;

    const duration =
      playerRef.current?.getDuration() || video?.durationSec || 0;
    await saveProgress(Math.floor(duration), true);
    setIsComplete(true);
    toast.success("🎉 Video completed! You can now proceed to the quiz.");
  }, [isComplete, video?.durationSec, saveProgress]);

  // Create YouTube player
  const createPlayer = useCallback(() => {
    if (!containerRef.current || !video) return;

    const youtubeId = extractYouTubeId(video.url);
    if (!youtubeId) {
      toast.error("Invalid YouTube URL");
      return;
    }

    // Don't recreate if already exists
    if (playerRef.current) return;

    playerRef.current = new window.YT.Player(containerRef.current, {
      height: "100%",
      width: "100%",
      videoId: youtubeId,
      playerVars: {
        autoplay: 0,
        modestbranding: 1,
        rel: 0,
        start: 0, // Always start from beginning for rewatching
      },
      events: {
        onReady: () => {
          setPlayerReady(true);
        },
        onStateChange: (event: YT.OnStateChangeEvent) => {
          const playing = event.data === window.YT.PlayerState.PLAYING;
          setIsPlaying(playing);

          if (event.data === window.YT.PlayerState.ENDED && !isComplete) {
            markComplete();
          }
        },
      },
    });

    // Save progress every 10 seconds (only if not complete)
    intervalRef.current = setInterval(() => {
      if (!playerRef.current?.getCurrentTime || isComplete) return;
      const current = Math.floor(playerRef.current.getCurrentTime());
      if (current > 0) {
        saveProgress(current, false);
      }
    }, 10000);
  }, [video, markComplete, saveProgress, isComplete]);

  // Load YouTube API
  useEffect(() => {
    if (!video || pageStatus !== "ready") return;

    // Check if API is already loaded
    if (window.YT && window.YT.Player) {
      createPlayer();
      return;
    }

    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScript = document.getElementsByTagName("script")[0];
    firstScript.parentNode?.insertBefore(tag, firstScript);

    window.onYouTubeIframeAPIReady = () => {
      createPlayer();
    };

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (progressIntervalRef.current)
        clearInterval(progressIntervalRef.current);
      if (playerRef.current?.destroy) {
        try {
          playerRef.current.destroy();
          playerRef.current = null;
        } catch {
          // Ignore destroy errors
        }
      }
    };
  }, [video, pageStatus, createPlayer]);

  // Update progress bar
  useEffect(() => {
    if (!playerReady || !video?.durationSec) return;

    progressIntervalRef.current = setInterval(() => {
      if (!playerRef.current?.getCurrentTime) return;

      const current = playerRef.current.getCurrentTime();
      const duration = video.durationSec;
      const pct = (current / duration) * 100;

      setCurrentTime(Math.floor(current));
      setProgress(pct);

      // Auto-complete at 95% (only if not already complete)
      if (pct >= 95 && !isComplete) {
        markComplete();
      }
    }, 1000);

    return () => {
      if (progressIntervalRef.current)
        clearInterval(progressIntervalRef.current);
    };
  }, [playerReady, video?.durationSec, isComplete, markComplete]);

  // Format time display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Get next step URL based on application status
  const getNextStepUrl = (): string => {
    if (!application) return "/dashboard/edit-profile/professional-application";

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
        return "/dashboard/edit-profile/professional-application";
    }
  };

  // Get button text based on status
  const getButtonText = (): string => {
    if (!isComplete && !video?.isCompleted) {
      return `Complete Video to Continue (${Math.round(progress)}%)`;
    }

    if (!application) return "Continue";

    switch (application.status) {
      case "VIDEO_PENDING":
      case "QUIZ_PENDING":
      case "QUIZ_FAILED":
        return "Proceed to Quiz";
      case "QUIZ_PASSED":
      case "ADMIN_REVIEW":
        return "View Application Status";
      case "APPROVED":
        return "Go to Dashboard";
      default:
        return "Continue";
    }
  };

  // Loading state
  if (status === "loading" || pageStatus === "loading") {
    return <LoadingSkeleton />;
  }

  // Error state
  if (pageStatus === "error") {
    return (
      <div className="p-4 max-w-3xl mx-auto">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load video. Please try again.
            <Button
              variant="link"
              className="p-0 h-auto ml-2"
              onClick={() => {
                setPageStatus("loading");
                fetchStatus();
              }}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // No application state
  if (pageStatus === "no_application") {
    return (
      <div className="p-4 max-w-3xl mx-auto">
        <Alert>
          <AlertTitle>Application Required</AlertTitle>
          <AlertDescription>
            You need to submit the application form first before watching the
            video.
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

  const canProceed = isComplete || video.isCompleted;

  return (
    <motion.div
      className="p-4 space-y-6 max-w-4xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="rounded-full"
            >
              <Link href="/dashboard/edit-profile/professional-application">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Link>
            </Button>
            <CardTitle className="text-xl text-black">
              Step 2: Watch Onboarding Video
            </CardTitle>
            <div className="w-20" />
          </div>
        </CardHeader>
      </Card>

      {/* Already Completed Info */}
      {video.isCompleted && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Alert className="border-green-500 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">
              Video Already Completed!
            </AlertTitle>
            <AlertDescription className="text-green-700">
              You&apos;ve already watched this video. Feel free to rewatch it or
              proceed to the next step.
            </AlertDescription>
          </Alert>
        </motion.div>
      )}

      {/* Just Completed Alert */}
      {isComplete && !video.isCompleted && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Alert className="border-green-500 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Video Completed!</AlertTitle>
            <AlertDescription className="text-green-700">
              Great job! You&apos;ve watched the onboarding video. Click the
              button below to proceed.
            </AlertDescription>
          </Alert>
        </motion.div>
      )}

      {/* Video Player Card */}
      <Card className="shadow-lg overflow-hidden">
        <CardContent className="p-0">
          {/* Video Container */}
          <div className="relative bg-black aspect-video">
            <div ref={containerRef} className="w-full h-full" />

            {/* Loading Overlay */}
            {!playerReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <div className="text-center text-white">
                  <Loader2 className="h-12 w-12 animate-spin mx-auto mb-2" />
                  <p>Loading video...</p>
                </div>
              </div>
            )}

            {/* Controls Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
              {/* Progress Bar */}
              <div className="mb-3">
                <Progress value={progress} className="h-2 bg-white/30" />
              </div>

              {/* Controls Row */}
              <div className="flex items-center justify-between text-white">
                <span className="text-sm font-medium">
                  {formatTime(currentTime)} / {formatTime(video.durationSec)}
                </span>

                <div className="flex items-center gap-2">
                  {/* Play/Pause */}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-white hover:bg-white/20"
                    onClick={() =>
                      isPlaying
                        ? playerRef.current?.pauseVideo()
                        : playerRef.current?.playVideo()
                    }
                    disabled={!playerReady}
                  >
                    {isPlaying ? (
                      <Pause className="h-5 w-5" />
                    ) : (
                      <Play className="h-5 w-5" />
                    )}
                  </Button>

                  {/* Mute/Unmute */}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-white hover:bg-white/20"
                    onClick={() => {
                      if (!playerRef.current) return;
                      if (isMuted) {
                        playerRef.current.unMute();
                      } else {
                        playerRef.current.mute();
                      }
                      setIsMuted(!isMuted);
                    }}
                    disabled={!playerReady}
                  >
                    {isMuted ? (
                      <VolumeX className="h-5 w-5" />
                    ) : (
                      <Volume2 className="h-5 w-5" />
                    )}
                  </Button>

                  {/* Completion Badge */}
                  {canProceed && (
                    <span className="flex items-center gap-1 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                      <CheckCircle className="h-3 w-3" />
                      Complete
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Info Section */}
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{video.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {canProceed
                    ? "You can rewatch anytime or proceed to the next step."
                    : "Watch at least 95% of the video to unlock the next step."}
                </p>
              </div>

              {isSaving && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Saving...
                </span>
              )}
            </div>

            {/* Progress Info */}
            {!canProceed && (
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      progress >= 95 ? "bg-green-500" : "bg-yellow-500"
                    }`}
                  />
                  <span>{Math.min(Math.round(progress), 100)}% watched</span>
                </div>

                {progress < 95 && (
                  <span className="text-muted-foreground">
                    ({Math.ceil(video.durationSec * 0.95 - currentTime)}s
                    remaining to unlock)
                  </span>
                )}
              </div>
            )}

            {/* Action Button */}
            <Button
              className="w-full bg-[#F3CFC6] hover:bg-[#e5b8ad] text-black rounded-full"
              size="lg"
              onClick={() => router.push(getNextStepUrl())}
              disabled={!canProceed}
            >
              {canProceed ? (
                <>
                  {getButtonText()}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              ) : (
                getButtonText()
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
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-9 w-24 rounded-full" />
            <Skeleton className="h-6 w-48" />
            <div className="w-20" />
          </div>
        </CardHeader>
      </Card>

      <Card className="shadow-lg overflow-hidden">
        <Skeleton className="aspect-video w-full" />
        <div className="p-4 space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-12 w-full rounded-full" />
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
