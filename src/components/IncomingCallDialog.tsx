
// src/components/IncomingCallDialog.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, PhoneOff, Video } from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useSession } from "next-auth/react";
import type { VideoCallSignal } from "@/lib/websocket/types";

declare global {
  interface Window {
    __incomingCallAudio?: HTMLAudioElement;
  }
}

interface IncomingCall {
  sessionId: string;
  senderId: string;
  senderName: string;
  senderImage?: string;
  appointmentId?: string;
}

export default function IncomingCallDialog() {
  const router = useRouter();
  const { data: session } = useSession();
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [isRinging, setIsRinging] = useState(false);

  const userName = session?.user?.name || "User";

  const handleVideoSignal = useCallback((signal: VideoCallSignal) => {
    console.log("Received video signal:", signal);

    switch (signal.type) {
      case "video_invite":
        // Show incoming call dialog
        setIncomingCall({
          sessionId: signal.sessionId,
          senderId: signal.senderId,
          senderName: signal.senderName,
          appointmentId: signal.appointmentId,
        });
        setIsRinging(true);

        // Play ringtone (optional)
        try {
          const audio = new Audio("/sounds/ringtone.mp3");
          audio.loop = true;
          audio.play().catch(() => { });
          // Store audio reference to stop later
          window.__incomingCallAudio = audio;
        } catch { }
        break;

      case "video_end":
      case "video_decline":
        // Other party ended/declined
        setIncomingCall(null);
        setIsRinging(false);
        stopRingtone();
        break;
    }
  }, []);

  const { sendVideoAccept, sendVideoDecline } = useWebSocket({
    enabled: !!session?.user,
    onVideoCallSignal: handleVideoSignal,
  });

  const stopRingtone = () => {
    try {
      const audio = window.__incomingCallAudio;
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
        delete window.__incomingCallAudio;
      }
    } catch { }
  };

  const handleAccept = useCallback(() => {
    if (!incomingCall) return;

    stopRingtone();
    setIsRinging(false);

    // Notify caller that we accepted
    sendVideoAccept(incomingCall.senderId, incomingCall.sessionId, userName);

    // Navigate to video session
    router.push(`/dashboard/video-session/${incomingCall.sessionId}`);

    setIncomingCall(null);
  }, [incomingCall, router, sendVideoAccept, userName]);

  const handleDecline = useCallback(() => {
    if (!incomingCall) return;

    stopRingtone();
    setIsRinging(false);

    // Notify caller that we declined
    sendVideoDecline(incomingCall.senderId, incomingCall.sessionId, userName);

    setIncomingCall(null);
  }, [incomingCall, sendVideoDecline, userName]);

  // Auto-decline after 60 seconds
  useEffect(() => {
    if (!incomingCall) return;

    const timeout = setTimeout(() => {
      handleDecline();
    }, 60000);

    return () => clearTimeout(timeout);
  }, [incomingCall, handleDecline]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRingtone();
    };
  }, []);

  return (
    <AnimatePresence>
      {incomingCall && (
        <Dialog open={true} onOpenChange={() => handleDecline()}>
          <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-gradient-to-b from-gray-900 to-gray-800 border-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="p-8 text-center text-white"
            >
              {/* Caller Avatar */}
              <motion.div
                animate={isRinging ? { scale: [1, 1.1, 1] } : {}}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="mb-6"
              >
                <Avatar className="w-24 h-24 mx-auto border-4 border-green-500 shadow-lg shadow-green-500/30">
                  <AvatarImage src={incomingCall.senderImage} />
                  <AvatarFallback className="text-2xl bg-[#F3CFC6] text-black">
                    {incomingCall.senderName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </motion.div>

              {/* Caller Name */}
              <h2 className="text-2xl font-bold mb-2">
                {incomingCall.senderName}
              </h2>
              <p className="text-gray-400 mb-8 flex items-center justify-center gap-2">
                <Video className="h-4 w-4" />
                Incoming Video Call...
              </p>

              {/* Pulsing ring animation */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {isRinging && (
                  <>
                    <motion.div
                      className="absolute w-32 h-32 rounded-full border-2 border-green-500/50"
                      animate={{ scale: [1, 2], opacity: [0.5, 0] }}
                      transition={{ repeat: Infinity, duration: 1.5, delay: 0 }}
                    />
                    <motion.div
                      className="absolute w-32 h-32 rounded-full border-2 border-green-500/50"
                      animate={{ scale: [1, 2], opacity: [0.5, 0] }}
                      transition={{
                        repeat: Infinity,
                        duration: 1.5,
                        delay: 0.5,
                      }}
                    />
                  </>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-center gap-8">
                {/* Decline */}
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    onClick={handleDecline}
                    className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/30"
                  >
                    <PhoneOff className="h-7 w-7" />
                  </Button>
                </motion.div>

                {/* Accept */}
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    onClick={handleAccept}
                    className="w-16 h-16 rounded-full bg-green-600 hover:bg-green-700 shadow-lg shadow-green-600/30"
                  >
                    <Phone className="h-7 w-7" />
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  );
}
