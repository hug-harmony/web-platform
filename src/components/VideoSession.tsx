// src/components/VideoSession.tsx
"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  Maximize2,
  Minimize2,
  Users,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useVideoCall } from "@/hooks/useVideoCall";
import { cn } from "@/lib/utils";

interface VideoSessionProps {
  sessionId: string;
  professionalName?: string;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

export default function VideoSession({
  sessionId,
  professionalName,
  onEnd,
  onError,
}: VideoSessionProps) {
  const router = useRouter();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleError = useCallback(
    (error: string) => {
      console.error("Video call error:", error);
      onError?.(error);
    },
    [onError]
  );

  const {
    isConnecting,
    isConnected,
    isVideoEnabled,
    isAudioEnabled,
    localVideoTileId,
    remoteVideoTileId,
    error,
    join,
    leave,
    endSession,
    toggleVideo,
    toggleAudio,
    bindVideoElement,
    unbindVideoElement,
  } = useVideoCall({
    sessionId,
    onParticipantJoined: (attendeeId) => {
      console.log("Participant joined:", attendeeId);
    },
    onParticipantLeft: (attendeeId) => {
      console.log("Participant left:", attendeeId);
    },
    onSessionEnded: () => {
      onEnd?.();
    },
    onError: handleError,
  });

  // Bind local video
  useEffect(() => {
    if (localVideoTileId && localVideoRef.current) {
      bindVideoElement(localVideoTileId, localVideoRef.current);
    }
    return () => {
      if (localVideoTileId) {
        unbindVideoElement(localVideoTileId);
      }
    };
  }, [localVideoTileId, bindVideoElement, unbindVideoElement]);

  // Bind remote video
  useEffect(() => {
    if (remoteVideoTileId && remoteVideoRef.current) {
      bindVideoElement(remoteVideoTileId, remoteVideoRef.current);
    }
    return () => {
      if (remoteVideoTileId) {
        unbindVideoElement(remoteVideoTileId);
      }
    };
  }, [remoteVideoTileId, bindVideoElement, unbindVideoElement]);

  // Auto-join on mount
  useEffect(() => {
    join();
    return () => {
      leave();
    };
  }, [join, leave]);

  // Auto-hide controls
  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isConnected) {
        setShowControls(false);
      }
    }, 3000);
  }, [isConnected]);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(console.error);
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(console.error);
      setIsFullscreen(false);
    }
  }, []);

  // Handle end call
  const handleEndCall = useCallback(async () => {
    await endSession();
  }, [endSession]);

  // Cleanup controls timeout
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  if (error) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-8 text-center">
          <div className="text-red-500 mb-4">
            <AlertCircle className="h-12 w-12 mx-auto mb-2" />
            <p className="text-lg font-semibold">Unable to join video call</p>
            <p className="text-sm text-muted-foreground mt-2">{error}</p>
          </div>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push("/dashboard/video-session")}
          >
            Go Back
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isConnecting) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-8 text-center">
          <div className="flex flex-col items-center">
            <Loader2 className="h-12 w-12 animate-spin text-[#F3CFC6] mb-4" />
            <p className="text-lg font-semibold">Connecting to video call...</p>
            <p className="text-sm text-muted-foreground mt-2">
              Please allow camera and microphone access when prompted
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full bg-black rounded-lg overflow-hidden",
        isFullscreen ? "fixed inset-0 z-50" : "aspect-video max-h-[80vh]"
      )}
      onMouseMove={handleMouseMove}
    >
      {/* Remote Video (Main) */}
      <div className="absolute inset-0">
        {remoteVideoTileId ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-900">
            <div className="text-center text-white">
              <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">
                Waiting for {professionalName || "participant"} to join...
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Local Video (Picture-in-Picture) */}
      <motion.div
        drag
        dragConstraints={containerRef}
        className="absolute bottom-20 right-4 w-48 h-36 rounded-lg overflow-hidden shadow-lg border-2 border-white/20 cursor-move"
      >
        {isVideoEnabled ? (
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover mirror"
          />
        ) : (
          <div className="w-full h-full bg-gray-800 flex items-center justify-center">
            <VideoOff className="h-8 w-8 text-white/50" />
          </div>
        )}
      </motion.div>

      {/* Controls */}
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: showControls ? 1 : 0 }}
        className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent"
      >
        <div className="flex items-center justify-center gap-4">
          {/* Toggle Video */}
          <Button
            variant={isVideoEnabled ? "secondary" : "destructive"}
            size="lg"
            className="rounded-full w-14 h-14"
            onClick={toggleVideo}
          >
            {isVideoEnabled ? (
              <Video className="h-6 w-6" />
            ) : (
              <VideoOff className="h-6 w-6" />
            )}
          </Button>

          {/* Toggle Audio */}
          <Button
            variant={isAudioEnabled ? "secondary" : "destructive"}
            size="lg"
            className="rounded-full w-14 h-14"
            onClick={toggleAudio}
          >
            {isAudioEnabled ? (
              <Mic className="h-6 w-6" />
            ) : (
              <MicOff className="h-6 w-6" />
            )}
          </Button>

          {/* End Call */}
          <Button
            variant="destructive"
            size="lg"
            className="rounded-full w-14 h-14 bg-red-600 hover:bg-red-700"
            onClick={handleEndCall}
          >
            <PhoneOff className="h-6 w-6" />
          </Button>

          {/* Fullscreen Toggle */}
          <Button
            variant="secondary"
            size="lg"
            className="rounded-full w-14 h-14"
            onClick={toggleFullscreen}
          >
            {isFullscreen ? (
              <Minimize2 className="h-6 w-6" />
            ) : (
              <Maximize2 className="h-6 w-6" />
            )}
          </Button>
        </div>
      </motion.div>

      {/* Connection Status */}
      <div className="absolute top-4 left-4">
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium",
            isConnected
              ? "bg-green-500/20 text-green-400"
              : "bg-yellow-500/20 text-yellow-400"
          )}
        >
          <div
            className={cn(
              "w-2 h-2 rounded-full",
              isConnected ? "bg-green-400 animate-pulse" : "bg-yellow-400"
            )}
          />
          {isConnected ? "Connected" : "Connecting..."}
        </div>
      </div>

      <style jsx>{`
        .mirror {
          transform: scaleX(-1);
        }
      `}</style>
    </div>
  );
}
