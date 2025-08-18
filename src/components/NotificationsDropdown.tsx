"use client";

import { useState, useEffect } from "react";
import { io } from "socket.io-client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Bell, MessageSquare, Calendar, DollarSign } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface Notification {
  id: string;
  type: "message" | "appointment" | "payment";
  content: string;
  timestamp: string;
  unread: boolean;
  relatedId?: string;
}

export default function NotificationsDropdown({
  className,
}: {
  className?: string;
}) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const socket = io(
      process.env.NEXT_PUBLIC_WEBSOCKET_URL || "http://localhost:3001"
    );
    socket.on("notification", (data: Notification) => {
      setNotifications((prev) => [data, ...prev].slice(0, 10));
      if (data.unread) {
        setUnreadCount((prev) => prev + 1);
        toast.success(data.content, { duration: 5000 });
      }
    });
    return () => {
      socket.disconnect();
    };
  }, []);

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === id ? { ...notif, unread: false } : notif
      )
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
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
      <DropdownMenuContent className="w-80 p-4" align="start">
        <div className="max-h-[300px] overflow-y-auto">
          {notifications.length ? (
            notifications.map((notif) => (
              <DropdownMenuItem
                key={notif.id}
                className="flex items-start space-x-3 p-3 mb-2 rounded-md hover:bg-gray-100"
                onClick={() => notif.unread && markAsRead(notif.id)}
              >
                {notif.type === "message" && (
                  <MessageSquare className="h-4 w-4 text-[#F3CFC6] mt-1" />
                )}
                {notif.type === "appointment" && (
                  <Calendar className="h-4 w-4 text-[#F3CFC6] mt-1" />
                )}
                {notif.type === "payment" && (
                  <DollarSign className="h-4 w-4 text-[#F3CFC6] mt-1" />
                )}
                <div className="flex-1">
                  <p className="text-sm text-gray-800 dark:text-gray-200">
                    {notif.content}
                  </p>
                  <p className="text-xs text-[#C4C4C4] mt-1">
                    {notif.timestamp}
                  </p>
                </div>
                {notif.relatedId && (
                  <Link
                    href={
                      notif.type === "message"
                        ? `/messaging/${notif.relatedId}`
                        : notif.type === "appointment"
                          ? `/appointments/${notif.relatedId}`
                          : `/payment/${notif.relatedId}`
                    }
                    className="text-[#F3CFC6] hover:text-[#C4C4C4] text-sm"
                  >
                    View
                  </Link>
                )}
              </DropdownMenuItem>
            ))
          ) : (
            <DropdownMenuItem className="text-gray-500 text-center p-3">
              No notifications
            </DropdownMenuItem>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
