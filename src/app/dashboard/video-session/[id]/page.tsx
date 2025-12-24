// src/app/dashboard/video-session/[id]/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import VideoSession from "@/components/VideoSession";
import { format } from "date-fns";
import { toast } from "sonner";

interface VideoSessionData {
  id: string;
  meetingId: string;
  status: string;
  scheduledStart: string | null;
  professional: {
    name: string;
    id: string;
  };
  user: {
    name: string;
    firstName: string | null;
    lastName: string | null;
  };
}

export default function VideoSessionPage() {
  const params = useParams();
  const router = useRouter();
  const { status: authStatus } = useSession();

  const [videoSession, setVideoSession] = useState<VideoSessionData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasJoined, setHasJoined] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const sessionId = params?.id as string;

  const fetchSession = useCallback(async () => {
    if (!sessionId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/videoSessions/${sessionId}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Video session not found");
        }
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch video session");
      }

      const data = await response.json();
      setVideoSession(data);
    } catch (err: unknown) {
      console.error("Fetch session error:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load video session";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (authStatus === "authenticated" && sessionId) {
      fetchSession();
    }
  }, [sessionId, authStatus, router, fetchSession]);

  const handleRetry = async () => {
    setIsRetrying(true);
    await fetchSession();
    setIsRetrying(false);
  };

  const handleJoinError = useCallback((errorMessage: string) => {
    toast.error(errorMessage);

    // If meeting expired, show option to go back
    if (
      errorMessage.includes("expired") ||
      errorMessage.includes("no longer")
    ) {
      setError(errorMessage);
      setHasJoined(false);
    }
  }, []);

  if (authStatus === "loading" || loading) {
    return (
      <div className="p-4 max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[60vh] w-full rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 max-w-4xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-500 mb-4 text-lg font-medium">{error}</p>
            <p className="text-gray-500 mb-6">
              The video session may have expired or been cancelled.
            </p>
            <div className="flex gap-4 justify-center">
              <Button
                variant="outline"
                onClick={handleRetry}
                disabled={isRetrying}
              >
                {isRetrying ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Try Again
              </Button>
              <Button onClick={() => router.push("/dashboard/video-session")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Sessions
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!videoSession) {
    return (
      <div className="p-4 max-w-4xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500 mb-4">Session not found</p>
            <Button onClick={() => router.push("/dashboard/video-session")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Sessions
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if session is no longer active
  if (
    ["COMPLETED", "CANCELLED", "FAILED", "NO_SHOW"].includes(
      videoSession.status
    )
  ) {
    return (
      <div className="p-4 max-w-4xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">Session Ended</p>
            <p className="text-gray-500 mb-6">
              This video session is no longer active (Status:{" "}
              {videoSession.status}).
            </p>
            <Button onClick={() => router.push("/dashboard/video-session")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Sessions
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const professionalName = videoSession.professional?.name || "Professional";

  // Pre-join lobby
  if (!hasJoined) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 max-w-2xl mx-auto"
      >
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => router.push("/dashboard/video-session")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-[#F3CFC6]" />
              Video Session with {professionalName}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {videoSession.scheduledStart && (
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {format(
                    new Date(videoSession.scheduledStart),
                    "MMMM d, yyyy"
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {format(new Date(videoSession.scheduledStart), "h:mm a")}
                </div>
              </div>
            )}

            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Before joining:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Ensure your camera and microphone are working</li>
                <li>• Find a quiet, well-lit space</li>
                <li>• Close unnecessary browser tabs</li>
                <li>• Use headphones for better audio quality</li>
              </ul>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                💡 Your browser will ask for camera and microphone permissions
                when you join.
              </p>
            </div>

            <div className="flex gap-4">
              <Button
                className="flex-1 bg-[#F3CFC6] hover:bg-[#F3CFC6]/90 text-black"
                size="lg"
                onClick={() => setHasJoined(true)}
              >
                Join Video Call
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => router.push("/dashboard/video-session")}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // In-call view
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-4 max-w-6xl mx-auto"
    >
      <VideoSession
        sessionId={sessionId}
        professionalName={professionalName}
        onEnd={() => router.push("/dashboard/video-session")}
        onError={handleJoinError}
      />
    </motion.div>
  );
}
