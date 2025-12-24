// src/components/LastOnlineUpdater.tsx
"use client";

import { useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useWebSocket } from "@/hooks/useWebSocket";

export function LastOnlineUpdater() {
  const { data: session } = useSession();
  const lastUpdateRef = useRef<number>(0);
  const isUpdatingRef = useRef<boolean>(false);

  // Update via REST API (fallback)
  const updateLastOnlineViaRest = useCallback(async () => {
    if (isUpdatingRef.current) return;

    const now = Date.now();
    // Throttle to max once per minute
    if (now - lastUpdateRef.current < 60000) return;

    isUpdatingRef.current = true;
    lastUpdateRef.current = now;

    try {
      await fetch("/api/users/update-last-online", { method: "POST" });
    } catch (error) {
      console.error("Failed to update last online:", error);
    } finally {
      isUpdatingRef.current = false;
    }
  }, []);

  // Connect to WebSocket - this automatically updates online status via Lambda
  const { isConnected, send } = useWebSocket({
    enabled: !!session?.user,
    onConnect: () => {
      console.log("WebSocket connected - user marked online via Lambda");
    },
    onDisconnect: () => {
      console.log("WebSocket disconnected");
    },
  });

  // Send heartbeat periodically when connected
  useEffect(() => {
    if (!isConnected || !session?.user?.id) return;

    // Send heartbeat every 2 minutes to keep lastOnline updated
    const heartbeatInterval = setInterval(
      () => {
        send({
          action: "heartbeat",
          userId: session.user.id,
        });
      },
      2 * 60 * 1000
    );

    return () => clearInterval(heartbeatInterval);
  }, [isConnected, session?.user?.id, send]);

  // Fallback: Use REST API when WebSocket is not connected
  useEffect(() => {
    if (!session?.user) return;

    const handleVisibilityChange = () => {
      if (!document.hidden && !isConnected) {
        updateLastOnlineViaRest();
      }
    };

    // Update immediately if not connected via WebSocket
    if (!isConnected) {
      updateLastOnlineViaRest();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Fallback polling only when WebSocket is not connected
    const interval = setInterval(
      () => {
        if (!isConnected && !document.hidden) {
          updateLastOnlineViaRest();
        }
      },
      5 * 60 * 1000
    ); // 5 minutes fallback

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(interval);
    };
  }, [session?.user, isConnected, updateLastOnlineViaRest]);

  return null;
}
