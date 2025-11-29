"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Bell, MessageSquare, Calendar, DollarSign, Eye } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface Notification {
  id: string;
  userid: string;
  senderid?: string;
  type: "message" | "appointment" | "payment" | "profile_visit";
  content: string;
  timestamp: string;
  unread: boolean;
  relatedid?: string;
}

export default function NotificationsDropdown({
  className,
}: {
  className?: string;
}) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setError("Notifications unavailable: Supabase configuration missing");
      toast.error("Notifications unavailable: Supabase configuration missing", {
        duration: 5000,
      });
      return;
    }

    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(10);
      if (error) {
        console.error("Fetch notifications error:", error);
        setError("Failed to load notifications");
        toast.error("Failed to load notifications", { duration: 5000 });
        return;
      }
      setNotifications(data || []);
      setUnreadCount((data || []).filter((n: Notification) => n.unread).length);
      setError(null);
    };

    fetchNotifications();

    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications((prev) => [newNotif, ...prev].slice(0, 10));
          if (newNotif.unread) {
            setUnreadCount((prev) => prev + 1);
            toast.success(newNotif.content, { duration: 5000 });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const markAsRead = async (id: string) => {
    if (!supabase) return;
    const { error } = await supabase
      .from("notifications")
      .update({ unread: false })
      .eq("id", id);
    if (error) {
      console.error("Mark as read error:", error);
      toast.error("Failed to mark notification as read", { duration: 5000 });
      return;
    }
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === id ? { ...notif, unread: false } : notif
      )
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
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
    if (!notif.relatedid) return null;

    switch (notif.type) {
      case "message":
        return `/dashboard/messaging/${notif.relatedid}`;
      case "appointment":
        return `/dashboard/appointments/${notif.relatedid}`;
      case "payment":
        return `/dashboard/payment/${notif.relatedid}`;
      case "profile_visit":
        return `/dashboard/profile/${notif.relatedid}`;
      default:
        return null;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className={`relative h-8 w-8 ${className}`}>
          <Bell className="h-5 w-5 text-[#F3CFC6]" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 p-4" align="end">
        <div className="max-h-[300px] overflow-y-auto">
          {error ? (
            <DropdownMenuItem className="text-gray-500 text-center p-3">
              {error}
            </DropdownMenuItem>
          ) : notifications.length ? (
            notifications.map((notif) => {
              const link = getNotificationLink(notif);
              return (
                <DropdownMenuItem
                  key={notif.id}
                  className={`flex items-start space-x-3 p-3 mb-2 rounded-md hover:bg-gray-100 ${
                    notif.unread ? "bg-[#F3CFC6]/10" : ""
                  }`}
                  onClick={() => notif.unread && markAsRead(notif.id)}
                >
                  {getNotificationIcon(notif.type)}
                  <div className="flex-1">
                    <p className="text-sm text-gray-800 dark:text-gray-200">
                      {notif.content}
                    </p>
                    <p className="text-xs text-[#C4C4C4] mt-1">
                      {new Date(notif.timestamp).toLocaleString()}
                    </p>
                  </div>
                  {link && (
                    <Link
                      href={link}
                      className="text-[#F3CFC6] hover:text-[#C4C4C4] text-sm"
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
