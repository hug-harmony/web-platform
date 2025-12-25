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
        rel?: 0;
        controls?: 0 | 1;
        playsinline?: 0 | 1;
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

const VIDEO_ALLOWED_STATUSES = [
  "VIDEO_PENDING",
  "QUIZ_PENDING",
  "QUIZ_FAILED",
  "QUIZ_PASSED",
  "ADMIN_REVIEW",
  "APPROVED",
];

export default function VideoPage() {
  const playerRef = useRef<YT.Player | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const saveIntervalRef = useRef<NodeJS.Timeout | null>(null);
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
    toast.success("Video completed! You can now proceed to the quiz.");
  }, [isComplete, video?.durationSec, saveProgress]);

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
        controls: 1,
        playsinline: 1,
        start: 0,
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
      if (saveIntervalRef.current !== null) {
        clearInterval(saveIntervalRef.current);
      }
      if (progressIntervalRef.current !== null) {
        clearInterval(progressIntervalRef.current);
      }
      playerRef.current?.destroy();
      void (playerRef.current = null); // Explicitly mark as intentional side effect
    };
  }, [video, pageStatus, createPlayer]);

  useEffect(() => {
    if (!playerReady || !video?.durationSec) return;

    progressIntervalRef.current = setInterval(() => {
      if (!playerRef.current?.getCurrentTime) return;

      const current = playerRef.current.getCurrentTime();
      const duration = video.durationSec;
      const pct = (current / duration) * 100;

      setCurrentTime(Math.floor(current));
      setProgress(pct);

      if (pct >= 90 && !isComplete) {
        markComplete();
      }
    }, 1000);

    return () => {
      if (progressIntervalRef.current !== null) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [playerReady, video?.durationSec, isComplete, markComplete]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
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
      <div className="p-4 max-w-3xl mx-auto">
        <Alert variant="destructive">
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
      <div className="p-4 max-w-3xl mx-auto">
        <Alert>
          <AlertTitle>Step Not Available</AlertTitle>
          <AlertDescription>
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-2 items-start justify-between">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="rounded-full"
            >
              <Link href="/dashboard/edit-profile/professional-application/status">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Status
              </Link>
            </Button>
            <CardTitle className="text-xl text-black">
              Step 2: Watch Onboarding Video
            </CardTitle>
            <div className="w-20" />
          </div>
        </CardHeader>
      </Card>

      {/* Already Completed Notice */}
      {canProceed && (
        <Alert className="border-green-500 bg-green-50">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <AlertTitle className="text-green-800">Video Completed</AlertTitle>
          <AlertDescription className="text-green-700">
            You have already watched this video. You may rewatch or proceed to
            the next step.
          </AlertDescription>
        </Alert>
      )}

      {/* Video Player */}
      <Card className="shadow-lg overflow-hidden">
        <CardContent className="p-0">
          <div className="relative bg-black aspect-video">
            <div ref={containerRef} className="w-full h-full" />

            {!playerReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                <div className="text-white text-center">
                  <Loader2 className="h-12 w-12 animate-spin mx-auto mb-3" />
                  <p className="text-lg">Loading video player...</p>
                </div>
              </div>
            )}

            {/* Custom Bottom Controls */}
            <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
              <div className="mb-4">
                <Progress value={progress} className="h-3 bg-white/20" />
              </div>

              <div className="flex items-center justify-between text-white">
                <div className="text-sm font-medium">
                  {formatTime(currentTime)} / {formatTime(video.durationSec)}
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-white hover:bg-white/20 rounded-full"
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
                      <Play className="h-6 w-6" />
                    )}
                  </Button>

                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-white hover:bg-white/20 rounded-full"
                    onClick={() => {
                      if (!playerRef.current) return;

                      if (playerRef.current.isMuted()) {
                        playerRef.current.unMute();
                      } else {
                        playerRef.current.mute();
                      }

                      setIsMuted(!isMuted);
                    }}
                    disabled={!playerReady}
                  >
                    {isMuted ? (
                      <VolumeX className="h-6 w-6" />
                    ) : (
                      <Volume2 className="h-6 w-6" />
                    )}
                  </Button>

                  {canProceed && (
                    <div className="flex items-center gap-2 bg-green-600 text-white px-3 py-1.5 rounded-full text-sm font-medium">
                      <CheckCircle className="h-4 w-4" />
                      Completed
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Info & Action */}
          <div className="p-6 space-y-5">
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                {video.name}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {canProceed
                  ? "You have completed this step. Proceed to the quiz when ready."
                  : "Watch at least 90% of the video to unlock the next step."}
              </p>
            </div>

            {!canProceed && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className={`h-3 w-3 rounded-full ${
                      progress >= 90 ? "bg-green-500" : "bg-amber-500"
                    }`}
                  />
                  <span className="font-medium">
                    {Math.round(progress)}% complete
                  </span>
                </div>
                <span className="text-muted-foreground">
                  {Math.max(
                    0,
                    Math.ceil(video.durationSec * 0.9 - currentTime)
                  )}{" "}
                  seconds remaining
                </span>
              </div>
            )}

            {isSaving && (
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Saving progress...
              </div>
            )}

            <Button
              size="lg"
              className="w-full bg-[#F3CFC6] hover:bg-[#e5b8ad] text-black rounded-full text-base font-medium"
              onClick={() => router.push(getNextStepUrl())}
              disabled={!canProceed}
            >
              {canProceed ? (
                <>
                  Proceed to Quiz
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              ) : (
                `Watch 90% to Proceed (${Math.round(progress)}%)`
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
          <div className="flex flex-col md:flex-row gap-2 items-start justify-between">
            <Skeleton className="h-9 w-32 rounded-full" />
            <Skeleton className="h-7 w-64" />
            <div className="w-20" />
          </div>
        </CardHeader>
      </Card>

      <Card className="shadow-lg overflow-hidden">
        <Skeleton className="aspect-video w-full bg-gray-200" />
        <div className="p-6 space-y-5">
          <Skeleton className="h-7 w-80" />
          <Skeleton className="h-4 w-full" />
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
