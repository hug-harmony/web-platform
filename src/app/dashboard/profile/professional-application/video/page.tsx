"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Play, Pause, Volume2, VolumeX } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// ✅ YouTube player types (Corrected and ESLint rule disabled for this block)
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

export default function VideoPage() {
  const playerRef = useRef<YT.Player | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const [video, setVideo] = useState<VideoData | null>(null);
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const { status } = useSession();
  const router = useRouter();

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/professionals/onboarding/status", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      if (data.step !== "VIDEO_PENDING") {
        router.push("/dashboard/profile/professional-application/status");
        return;
      }
      setVideo(data.video);
    } catch {
      toast.error("Failed to load video");
    }
  }, [router]);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated") fetchStatus();
  }, [status, router, fetchStatus]);

  const markComplete = useCallback(async () => {
    if (!playerRef.current) return;
    const duration = Math.floor(playerRef.current.getDuration());
    await saveProgress(duration, true);
    toast.success("Video completed! You can now proceed to the quiz.");
    setIsComplete(true);
  }, []);

  const createPlayer = useCallback(() => {
    if (!containerRef.current || !video) return;
    const youtubeId = extractYouTubeId(video.url);
    if (!youtubeId) {
      toast.error("Invalid YouTube URL");
      return;
    }

    playerRef.current = new window.YT.Player(containerRef.current, {
      height: "100%",
      width: "100%",
      videoId: youtubeId,
      playerVars: {
        autoplay: 0,
        modestbranding: 1,
        rel: 0,
        start: video.watchedSec,
      },
      events: {
        onReady: (event: YT.PlayerEvent) => {
          setPlayerReady(true);
          event.target.playVideo();
        },
        onStateChange: (event: YT.OnStateChangeEvent) => {
          setIsPlaying(event.data === window.YT.PlayerState.PLAYING);
          if (event.data === window.YT.PlayerState.ENDED) {
            markComplete();
          }
        },
      },
    });

    // Save progress every 5s
    intervalRef.current = setInterval(() => {
      if (!playerRef.current?.getCurrentTime) return;
      const current = Math.floor(playerRef.current.getCurrentTime());
      saveProgress(current, false);
    }, 5000);
  }, [video, markComplete]);

  useEffect(() => {
    if (!video) return;

    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScript = document.getElementsByTagName("script")[0];
    firstScript.parentNode?.insertBefore(tag, firstScript);

    window.onYouTubeIframeAPIReady = () => {
      createPlayer();
    };

    const interval = intervalRef.current;
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [video, createPlayer]);

  const saveProgress = async (watchedSec: number, isCompleted: boolean) => {
    try {
      await fetch("/api/professionals/onboarding/video/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ watchedSec, isCompleted }),
        credentials: "include",
      });
    } catch {
      console.error("Failed to save progress");
    }
  };

  useEffect(() => {
    if (!playerRef.current?.getCurrentTime || !video?.durationSec) return;

    const update = () => {
      const current = playerRef.current!.getCurrentTime();
      const pct = (current / video.durationSec) * 100;
      setProgress(pct);
      if (pct >= 95 && !video.isCompleted && !isComplete) {
        markComplete();
      }
    };

    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [video?.durationSec, video?.isCompleted, markComplete, isComplete]);

  if (status === "loading" || !video)
    return (
      <div className="p-4">
        <Card>
          <CardContent>
            <p className="text-center py-8">Loading video...</p>
          </CardContent>
        </Card>
      </div>
    );

  return (
    <motion.div
      className="p-4 space-y-6 max-w-4xl mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/profile/professional-application">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Link>
            </Button>
            <CardTitle>Step 2: Watch Onboarding Video</CardTitle>
            <div className="w-24" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
            <div ref={containerRef} className="w-full h-full" />
            {!playerReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
              <Progress value={progress} className="h-2 mb-2" />
              <div className="flex items-center justify-between text-white text-sm">
                <span>
                  {Math.floor(video.watchedSec)}s / {video.durationSec}s
                </span>
                <div className="flex gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() =>
                      isPlaying
                        ? playerRef.current?.pauseVideo()
                        : playerRef.current?.playVideo()
                    }
                    disabled={!playerReady}
                  >
                    {isPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
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
                      <VolumeX className="h-4 w-4" />
                    ) : (
                      <Volume2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Watch at least 95% to unlock the quiz.
          </p>

          <Button
            className="w-full"
            onClick={() =>
              router.push("/dashboard/profile/professional-application/quiz")
            }
            disabled={!isComplete}
          >
            Proceed to Quiz
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function extractYouTubeId(url: string): string | null {
  const regex =
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = url.match(regex);
  return match?.[1] ?? null;
}
