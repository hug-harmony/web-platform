// src/components/LastOnlineUpdater.tsx
"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

export function LastOnlineUpdater() {
  const { data: session } = useSession();

  useEffect(() => {
    if (!session?.user) return;

    const updateLastOnline = () => {
      if (!document.hidden) {
        fetch("/api/users/update-last-online", { method: "POST" }).catch(
          console.error
        );
      }
    };

    // Update immediately
    updateLastOnline();

    // Update on visibility change
    document.addEventListener("visibilitychange", updateLastOnline);

    // Update every 3 minutes when active
    const interval = setInterval(updateLastOnline, 3 * 60 * 1000);

    return () => {
      document.removeEventListener("visibilitychange", updateLastOnline);
      clearInterval(interval);
    };
  }, [session]);

  return null;
}
