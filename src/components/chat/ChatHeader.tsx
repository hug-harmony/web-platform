// src/components/chat/ChatHeader.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Notebook, Wifi, WifiOff, Video, Phone, Loader2 } from "lucide-react";
import { formatLastOnline } from "@/lib/formatLastOnline";
import { cn } from "@/lib/utils";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import type { Participant } from "@/types/chat";
import type { VideoCallSignal } from "@/lib/websocket/types";

interface ChatHeaderProps {
  otherUser: Participant | undefined;
  onNotesClick: () => void;
  isConnected?: boolean;
  professionalId?: string | null;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  otherUser,
  onNotesClick,
  isConnected = true,
  professionalId,
}) => {
  const router = useRouter();
  const { data: session } = useSession();

  // Real-time online status state
  const [isOtherUserOnline, setIsOtherUserOnline] = useState(false);
  const [lastOnlineTime, setLastOnlineTime] = useState<Date | null>(null);

  // Video call state
  const [isCallDialogOpen, setIsCallDialogOpen] = useState(false);
  const [isStartingCall, setIsStartingCall] = useState(false);
  const [callDeclined, setCallDeclined] = useState(false);
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);

  // Build other user name from available fields
  const otherUserName = otherUser
    ? `${otherUser.firstName || ""} ${otherUser.lastName || ""}`.trim() ||
      "Unknown User"
    : "Unknown User";

  const profileImage = otherUser?.profileImage;

  const initials = otherUserName
    .split(" ")
    .map((n: string) => n.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const currentUserName = session?.user?.name || "Someone";

  // Initialize last online from otherUser data
  useEffect(() => {
    if (otherUser?.lastOnline) {
      const lastOnline = new Date(otherUser.lastOnline);
      setLastOnlineTime(lastOnline);
      // Consider online if last activity was within 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      setIsOtherUserOnline(lastOnline > fiveMinutesAgo);
    }
  }, [otherUser?.lastOnline]);

  // Handle video call signals
  const handleVideoSignal = useCallback(
    (signal: VideoCallSignal) => {
      if (signal.senderId !== otherUser?.id) return;

      switch (signal.type) {
        case "video_accept":
          // Other user accepted, navigate to video session
          if (pendingSessionId) {
            toast.success(`${otherUserName} accepted the call!`);
            setIsCallDialogOpen(false);
            setIsStartingCall(false);
            router.push(`/dashboard/video-session/${pendingSessionId}`);
          }
          break;

        case "video_decline":
          // Other user declined
          setCallDeclined(true);
          setIsStartingCall(false);
          toast.error(`${otherUserName} declined the call`);
          setTimeout(() => {
            setIsCallDialogOpen(false);
            setCallDeclined(false);
            setPendingSessionId(null);
          }, 2000);
          break;
      }
    },
    [otherUser?.id, otherUserName, pendingSessionId, router]
  );

  // WebSocket for online status and video signaling
  const { sendVideoInvite, sendVideoEnd } = useWebSocket({
    enabled: !!session?.user && !!otherUser?.id,
    onOnlineStatusChange: useCallback(
      (userId: string, online: boolean) => {
        if (userId === otherUser?.id) {
          console.log(`Chat partner online status changed: ${online}`);
          setIsOtherUserOnline(online);
          if (!online) {
            setLastOnlineTime(new Date());
          }
        }
      },
      [otherUser?.id]
    ),
    onVideoCallSignal: handleVideoSignal,
  });

  // Start video call
  const handleStartVideoCall = async () => {
    if (!otherUser?.id || !session?.user?.id) {
      toast.error("Unable to start call");
      return;
    }

    // Check if other user is online
    if (!isOtherUserOnline) {
      toast.error(`${otherUserName} is currently offline`);
      return;
    }

    setIsStartingCall(true);
    setCallDeclined(false);

    try {
      // Create video session
      const res = await fetch("/api/video/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          professionalId: professionalId || otherUser.id,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create video session");
      }

      const data = await res.json();
      const sessionId = data.videoSession.id;

      setPendingSessionId(sessionId);

      // Send video invite via WebSocket
      sendVideoInvite(otherUser.id, sessionId, currentUserName);

      // Show calling dialog
      setIsCallDialogOpen(true);
    } catch (error) {
      console.error("Failed to start video call:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to start video call"
      );
      setIsStartingCall(false);
    }
  };

  // Cancel outgoing call
  const handleCancelCall = () => {
    if (pendingSessionId && otherUser?.id) {
      sendVideoEnd(otherUser.id, pendingSessionId);

      // End the session on the server
      fetch(`/api/video/end/${pendingSessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "cancelled" }),
      }).catch(console.error);
    }

    setIsCallDialogOpen(false);
    setIsStartingCall(false);
    setPendingSessionId(null);
    setCallDeclined(false);
  };

  // Calculate display values
  const { text: initialStatusText, isOnline: initialIsOnline } =
    formatLastOnline(
      lastOnlineTime ||
        (otherUser?.lastOnline ? new Date(otherUser.lastOnline) : null)
    );

  // Prefer real-time status over initial status
  const displayIsOnline = isOtherUserOnline || initialIsOnline;
  const displayStatusText = isOtherUserOnline ? "Online" : initialStatusText;

  // Check if video calling is available (user must be a professional or talking to one)
  const canStartVideoCall = otherUser?.isProfessional || professionalId;

  return (
    <>
      <CardHeader className="p-4 sm:p-6 border-b bg-[#F3CFC6]/20 dark:bg-[#C4C4C4]/20 flex flex-row items-center justify-between space-x-2">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Avatar className="h-10 w-10 border-2 border-white">
              <AvatarImage
                src={profileImage || "/avatar-placeholder.png"}
                alt={otherUserName}
              />
              <AvatarFallback className="bg-[#C4C4C4] text-black">
                {initials}
              </AvatarFallback>
            </Avatar>
            {/* Online indicator dot */}
            <div
              className={cn(
                "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white transition-colors duration-300",
                displayIsOnline ? "bg-green-500 animate-pulse" : "bg-gray-400"
              )}
              title={displayStatusText}
            />
          </div>
          <div className="flex flex-col">
            <p className="font-semibold text-black dark:text-white">
              {otherUserName}
            </p>
            <p
              className={cn(
                "text-xs transition-colors duration-300",
                displayIsOnline
                  ? "text-green-600 font-medium"
                  : "text-[#C4C4C4]"
              )}
            >
              {displayStatusText}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Connection status indicator */}
          <div
            className={cn(
              "flex items-center space-x-1 px-2 py-1 rounded-full text-xs",
              isConnected
                ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400"
            )}
          >
            {isConnected ? (
              <>
                <Wifi className="h-3 w-3" />
                <span className="hidden sm:inline">Live</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3" />
                <span className="hidden sm:inline">Reconnecting...</span>
              </>
            )}
          </div>

          {/* Video Call Button */}
          {canStartVideoCall && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleStartVideoCall}
                    disabled={isStartingCall || !displayIsOnline}
                    className={cn(
                      "text-[#000] hover:bg-[#fff]/80 dark:hover:bg-[#C4C4C4]/20",
                      displayIsOnline &&
                        "hover:text-green-600 hover:bg-green-50"
                    )}
                  >
                    {isStartingCall ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Video className="h-5 w-5" />
                    )}
                    <span className="hidden sm:inline ml-1">Call</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {displayIsOnline
                    ? "Start video call"
                    : `${otherUserName} is offline`}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Notes Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onNotesClick}
            className="text-[#000] hover:bg-[#fff]/80 dark:hover:bg-[#C4C4C4]/20"
          >
            <Notebook className="h-5 w-5 mr-1" />
            <span className="hidden sm:inline">Notes</span>
          </Button>
        </div>
      </CardHeader>

      {/* Calling Dialog */}
      <Dialog open={isCallDialogOpen} onOpenChange={handleCancelCall}>
        <DialogContent className="sm:max-w-md bg-gradient-to-b from-gray-900 to-gray-800 border-none text-white">
          <DialogHeader className="text-center">
            <DialogTitle className="text-xl">
              {callDeclined ? "Call Declined" : "Calling..."}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {callDeclined
                ? `${otherUserName} declined your call`
                : `Waiting for ${otherUserName} to answer`}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center py-8">
            {/* Avatar with pulsing ring */}
            <div className="relative mb-6">
              <Avatar className="h-24 w-24 border-4 border-white/20">
                <AvatarImage
                  src={profileImage || "/avatar-placeholder.png"}
                  alt={otherUserName}
                />
                <AvatarFallback className="text-2xl bg-[#F3CFC6] text-black">
                  {initials}
                </AvatarFallback>
              </Avatar>

              {/* Pulsing rings */}
              {!callDeclined && (
                <>
                  <div className="absolute inset-0 rounded-full border-2 border-green-500/50 animate-ping" />
                  <div
                    className="absolute inset-0 rounded-full border-2 border-green-500/30 animate-ping"
                    style={{ animationDelay: "0.5s" }}
                  />
                </>
              )}
            </div>

            <p className="text-lg font-semibold mb-2">{otherUserName}</p>

            {!callDeclined && (
              <div className="flex items-center gap-2 text-gray-400">
                <Phone className="h-4 w-4 animate-pulse" />
                <span>Ringing...</span>
              </div>
            )}
          </div>

          <DialogFooter className="justify-center">
            <Button
              onClick={handleCancelCall}
              className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700"
            >
              <Phone className="h-6 w-6 rotate-[135deg]" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ChatHeader;
