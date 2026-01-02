// src/components/NotificationsDropdown.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Bell,
  MessageSquare,
  Calendar,
  DollarSign,
  Eye,
  RefreshCw,
  Video,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Notification } from "@/lib/websocket/types";

export default function NotificationsDropdown({
  className,
}: {
  className?: string;
}) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { data: session, status } = useSession();

  // Track if component is mounted to prevent state updates after unmount
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    if (status !== "authenticated") return;

    try {
      const response = await fetch("/api/notifications?limit=10");

      if (!response.ok) {
        throw new Error("Failed to fetch notifications");
      }

      const data = await response.json();

      if (isMounted.current) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
        setError(null);
      }
    } catch (err) {
      console.error("Fetch notifications error:", err);
      if (isMounted.current) {
        setError("Failed to load notifications");
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [status]);

  // Initial fetch
  useEffect(() => {
    if (status === "authenticated") {
      fetchNotifications();
    }
  }, [status, fetchNotifications]);

  // Handle incoming WebSocket notification
  const handleWebSocketNotification = useCallback(
    (notification: Notification) => {
      console.log(
        "[NotificationsDropdown] Received WebSocket notification:",
        notification
      );

      // Verify this notification is for the current user
      if (notification.userId !== session?.user?.id) {
        console.log(
          "[NotificationsDropdown] Notification not for current user, ignoring"
        );
        return;
      }

      if (!isMounted.current) return;

      // Add to the beginning of the list, remove duplicates
      setNotifications((prev) => {
        // Check if notification already exists
        const exists = prev.some((n) => n.id === notification.id);
        if (exists) {
          console.log(
            "[NotificationsDropdown] Notification already exists, skipping"
          );
          return prev;
        }

        // Add new notification at the beginning, limit to 10
        const updated = [notification, ...prev].slice(0, 10);
        console.log(
          "[NotificationsDropdown] Updated notifications list:",
          updated.length
        );
        return updated;
      });

      // Update unread count if the notification is unread
      if (notification.unreadBool) {
        setUnreadCount((prev) => prev + 1);

        // Show toast notification
        toast.success(notification.content, {
          duration: 5000,
          icon: getNotificationIcon(notification.type),
        });
      }
    },
    [session?.user?.id]
  );

  // WebSocket for real-time notifications
  const { isConnected } = useWebSocket({
    enabled: status === "authenticated",
    onNotification: handleWebSocketNotification,
  });

  // Log connection status changes
  useEffect(() => {
    console.log("[NotificationsDropdown] WebSocket connected:", isConnected);
  }, [isConnected]);

  // Mark as read
  const markAsRead = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unread: false }),
      });

      if (!response.ok) {
        throw new Error("Failed to mark as read");
      }

      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === id
            ? { ...notif, unreadBool: false, unread: "false" }
            : notif
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Mark as read error:", err);
      toast.error("Failed to mark notification as read");
    }
  };

  const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
      case "message":
        return <MessageSquare className="h-4 w-4 text-[#F3CFC6] mt-1" />;
      case "appointment":
        return <Calendar className="h-4 w-4 text-[#F3CFC6] mt-1" />;
      case "payment":
        return <DollarSign className="h-4 w-4 text-[#F3CFC6] mt-1" />;
      case "profile_visit":
        return <Eye className="h-4 w-4 text-[#F3CFC6] mt-1" />;
      case "video_call":
        return <Video className="h-4 w-4 text-[#F3CFC6] mt-1" />;
      default:
        return <Bell className="h-4 w-4 text-[#F3CFC6] mt-1" />;
    }
  };

  const getNotificationLink = (notif: Notification) => {
    if (!notif.relatedId) return null;

    switch (notif.type) {
      case "message":
        return `/dashboard/messaging/${notif.relatedId}`;
      case "appointment":
        return `/dashboard/appointments`;
      case "payment":
        return `/dashboard/payment`;
      case "profile_visit":
        return `/dashboard/profile/${notif.relatedId}`;
      case "video_call":
        return `/dashboard/video-session/${notif.relatedId}`;
      default:
        return null;
    }
  };

  if (status !== "authenticated") {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className={`relative h-8 w-8 ${className}`}>
          <Bell className="h-5 w-5 text-[#F3CFC6]" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
          {/* Connection indicator */}
          <span
            className={`absolute bottom-0 right-0 h-2 w-2 rounded-full ${
              isConnected ? "bg-green-500" : "bg-gray-400"
            }`}
            title={isConnected ? "Real-time connected" : "Connecting..."}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 p-4" align="end">
        <div className="flex justify-between items-center mb-2">
          <span className="font-semibold text-sm">
            Notifications
            {isConnected && (
              <span className="ml-2 text-xs text-green-500">● Live</span>
            )}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchNotifications}
            disabled={loading}
            className="h-6 w-6 p-0"
            title="Refresh notifications"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {error ? (
            <div className="text-gray-500 text-center p-3 text-sm">
              {error}
              <Button
                variant="link"
                size="sm"
                onClick={fetchNotifications}
                className="block mx-auto mt-2"
              >
                Try again
              </Button>
            </div>
          ) : loading ? (
            <div className="text-gray-500 text-center p-3">Loading...</div>
          ) : notifications.length > 0 ? (
            notifications.map((notif) => {
              const link = getNotificationLink(notif);
              return (
                <DropdownMenuItem
                  key={notif.id}
                  className={`flex items-start space-x-3 p-3 mb-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer ${
                    notif.unreadBool ? "bg-[#F3CFC6]/10" : ""
                  }`}
                  onClick={() => notif.unreadBool && markAsRead(notif.id)}
                >
                  {getNotificationIcon(notif.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 dark:text-gray-200 line-clamp-2">
                      {notif.content}
                    </p>
                    <p className="text-xs text-[#C4C4C4] mt-1">
                      {formatTimestamp(notif.timestamp)}
                    </p>
                  </div>
                  {link && (
                    <Link
                      href={link}
                      className="text-[#F3CFC6] hover:text-[#C4C4C4] text-sm flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View
                    </Link>
                  )}
                </DropdownMenuItem>
              );
            })
          ) : (
            <div className="text-gray-500 text-center p-3">
              No notifications
            </div>
          )}
        </div>
        {notifications.length > 0 && (
          <div className="pt-2 border-t mt-2">
            <Link
              href="/dashboard/notifications"
              className="text-[#F3CFC6] hover:text-[#C4C4C4] text-sm block text-center"
            >
              View all notifications
            </Link>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Format timestamp to relative time
 */
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}
