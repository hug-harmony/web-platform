// src/components/PushNotificationManager.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Bell, BellOff, BellRing, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const IS_DEV = process.env.NODE_ENV === "development";

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer;
}

interface PushNotificationManagerProps {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  showText?: boolean;
  className?: string;
}

export default function PushNotificationManager({
  variant = "outline",
  size = "sm",
  showText = true,
  className = "",
}: PushNotificationManagerProps) {
  const { status } = useSession();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Start with loading true
  const [permission, setPermission] =
    useState<NotificationPermission>("default");
  const [serviceWorkerReady, setServiceWorkerReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check support and current subscription status
  useEffect(() => {
    const checkSupport = async () => {
      // Check basic support
      const hasNotificationAPI = "Notification" in window;
      const hasServiceWorker = "serviceWorker" in navigator;
      const hasPushManager = "PushManager" in window;

      if (!hasNotificationAPI || !hasServiceWorker || !hasPushManager) {
        setIsSupported(false);
        setIsLoading(false);
        setError("Push notifications not supported in this browser");
        return;
      }

      setIsSupported(true);
      setPermission(Notification.permission);

      // Check if VAPID key is configured
      if (!VAPID_PUBLIC_KEY) {
        setIsLoading(false);
        setError("Push notifications not configured");
        return;
      }

      // Wait for service worker with timeout
      try {
        const timeoutPromise = new Promise<null>((_, reject) => {
          setTimeout(() => reject(new Error("Service worker timeout")), 5000);
        });

        const swPromise = navigator.serviceWorker.ready;

        const registration = await Promise.race([swPromise, timeoutPromise]);

        if (!registration) {
          throw new Error("Service worker not available");
        }

        setServiceWorkerReady(true);

        // Check existing subscription
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
        setError(null);
      } catch (err) {
        console.error("Service worker check failed:", err);

        if (IS_DEV) {
          setError("Push disabled in development mode");
        } else {
          setError("Service worker not ready");
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (status === "authenticated") {
      checkSupport();
    } else if (status === "unauthenticated") {
      setIsLoading(false);
    }
  }, [status]);

  const subscribe = useCallback(async () => {
    if (!VAPID_PUBLIC_KEY) {
      toast.error("Push notifications not configured");
      return;
    }

    if (!serviceWorkerReady) {
      toast.error("Service worker not ready. Please refresh the page.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Request permission
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== "granted") {
        toast.error("Please allow notifications to receive updates");
        setIsLoading(false);
        return;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      // Send subscription to server
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save subscription");
      }

      setIsSubscribed(true);
      toast.success(
        "Push notifications enabled! You'll receive alerts even when the app is closed."
      );
    } catch (err) {
      console.error("Subscribe error:", err);
      const message =
        err instanceof Error ? err.message : "Failed to enable notifications";
      toast.error(message);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [serviceWorkerReady]);

  const unsubscribe = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe from push
        await subscription.unsubscribe();

        // Remove from server
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
      }

      setIsSubscribed(false);
      toast.success("Push notifications disabled");
    } catch (err) {
      console.error("Unsubscribe error:", err);
      const message =
        err instanceof Error ? err.message : "Failed to disable notifications";
      toast.error(message);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Don't render if not authenticated
  if (status !== "authenticated") {
    return null;
  }

  // Not supported
  if (!isSupported && !isLoading) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 text-sm text-muted-foreground cursor-not-allowed">
              <AlertCircle className="h-4 w-4" />
              {showText && <span>Notifications unavailable</span>}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{error || "Push notifications not supported in this browser"}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Permission denied
  if (permission === "denied") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 text-sm text-muted-foreground cursor-not-allowed">
              <BellOff className="h-4 w-4 text-destructive" />
              {showText && <span>Notifications blocked</span>}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              Notifications are blocked. Please enable them in your browser
              settings.
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Development mode - show disabled state
  if (IS_DEV && !serviceWorkerReady && !isLoading) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size={size}
              disabled
              className={`gap-2 opacity-60 ${className}`}
            >
              <Bell className="h-4 w-4" />
              {showText && "Push (Dev Mode)"}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              Push notifications are disabled in development mode. Deploy to
              production to test.
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Error state (non-blocking)
  if (error && !isLoading && !serviceWorkerReady) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size={size}
              disabled
              className={`gap-2 opacity-60 ${className}`}
            >
              <AlertCircle className="h-4 w-4" />
              {showText && "Notifications"}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{error}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Button
        variant="outline"
        size={size}
        disabled
        className={`gap-2 ${className}`}
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        {showText && "Checking..."}
      </Button>
    );
  }

  // Normal interactive state
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={isSubscribed ? "outline" : variant}
            size={size}
            onClick={isSubscribed ? unsubscribe : subscribe}
            disabled={isLoading}
            className={`gap-2 ${isSubscribed ? "border-green-500/50 text-green-600 hover:text-green-700" : ""} ${className}`}
          >
            {isSubscribed ? (
              <BellRing className="h-4 w-4" />
            ) : (
              <Bell className="h-4 w-4" />
            )}
            {showText &&
              (isSubscribed ? "Notifications On" : "Enable Notifications")}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {isSubscribed
              ? "Click to disable push notifications"
              : "Get notified about messages, appointments, and more"}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
