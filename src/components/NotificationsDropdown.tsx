"use client";

import { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useWebSocket } from "@/hooks/useWebSocket";

interface Notification {
  id: string;
  userId: string;
  senderId?: string;
  type: "message" | "appointment" | "payment" | "profile_visit";
  content: string;
  timestamp: string;
  unread: string;
  unreadBool: boolean;
  relatedId?: string;
}

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

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    if (status !== "authenticated") return;

    try {
      const response = await fetch("/api/notifications?limit=10");

      if (!response.ok) {
        throw new Error("Failed to fetch notifications");
      }

      const data = await response.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
      setError(null);
    } catch (err) {
      console.error("Fetch notifications error:", err);
      setError("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [status]);

  // Initial fetch
  useEffect(() => {
    if (status === "authenticated") {
      fetchNotifications();
    }
  }, [status, fetchNotifications]);

  // WebSocket for real-time notifications
  const { isConnected } = useWebSocket({
    enabled: status === "authenticated",
    onNotification: (notification) => {
      // Only add if it's for this user
      if (notification.userId === session?.user?.id) {
        setNotifications((prev) => [notification, ...prev].slice(0, 10));
        if (notification.unreadBool) {
          setUnreadCount((prev) => prev + 1);
          toast.success(notification.content, { duration: 5000 });
        }
      }
    },
  });

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
      toast.error("Failed to mark notification as read", { duration: 5000 });
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
        return `/dashboard/appointments/${notif.relatedId}`;
      case "payment":
        return `/dashboard/payment/${notif.relatedId}`;
      case "profile_visit":
        return `/dashboard/profile/${notif.relatedId}`;
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
            <span className="absolute top-0 right-0 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
          {/* Connection indicator */}
          <span
            className={`absolute bottom-0 right-0 h-2 w-2 rounded-full ${
              isConnected ? "bg-green-500" : "bg-gray-400"
            }`}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 p-4" align="end">
        <div className="flex justify-between items-center mb-2">
          <span className="font-semibold text-sm">Notifications</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchNotifications}
            disabled={loading}
            className="h-6 w-6 p-0"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {error ? (
            <DropdownMenuItem className="text-gray-500 text-center p-3">
              {error}
            </DropdownMenuItem>
          ) : loading ? (
            <DropdownMenuItem className="text-gray-500 text-center p-3">
              Loading...
            </DropdownMenuItem>
          ) : notifications.length ? (
            notifications.map((notif) => {
              const link = getNotificationLink(notif);
              return (
                <DropdownMenuItem
                  key={notif.id}
                  className={`flex items-start space-x-3 p-3 mb-2 rounded-md hover:bg-gray-100 cursor-pointer ${
                    notif.unreadBool ? "bg-[#F3CFC6]/10" : ""
                  }`}
                  onClick={() => notif.unreadBool && markAsRead(notif.id)}
                >
                  {getNotificationIcon(notif.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 dark:text-gray-200 truncate">
                      {notif.content}
                    </p>
                    <p className="text-xs text-[#C4C4C4] mt-1">
                      {new Date(notif.timestamp).toLocaleString()}
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
            <DropdownMenuItem className="text-gray-500 text-center p-3">
              No notifications
            </DropdownMenuItem>
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
