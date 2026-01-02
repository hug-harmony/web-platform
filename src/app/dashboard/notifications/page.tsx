// src/app/dashboard/notifications/page.tsx
"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  CheckCircle,
  MessageSquare,
  Calendar,
  DollarSign,
  Search,
  Filter,
  Eye,
  CheckCheck,
  RefreshCw,
  Video,
  Keyboard,
  X,
  Inbox,
  Mail,
  MailOpen,
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Notification } from "@/lib/websocket/types";

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, staggerChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

// Type color mapping
const TYPE_COLORS: Record<string, { bg: string; text: string; icon: string }> =
  {
    message: {
      bg: "bg-blue-100",
      text: "text-blue-700",
      icon: "text-blue-500",
    },
    appointment: {
      bg: "bg-purple-100",
      text: "text-purple-700",
      icon: "text-purple-500",
    },
    payment: {
      bg: "bg-green-100",
      text: "text-green-700",
      icon: "text-green-500",
    },
    profile_visit: {
      bg: "bg-orange-100",
      text: "text-orange-700",
      icon: "text-orange-500",
    },
    video_call: {
      bg: "bg-pink-100",
      text: "text-pink-700",
      icon: "text-pink-500",
    },
    default: {
      bg: "bg-gray-100",
      text: "text-gray-700",
      icon: "text-gray-500",
    },
  };

export default function NotificationsPage() {
  const [notificationsList, setNotificationsList] = useState<Notification[]>(
    []
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { data: session, status } = useSession();
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut handler (/ to focus)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }

      if (
        e.key === "Escape" &&
        document.activeElement === searchInputRef.current
      ) {
        setSearchQuery("");
        searchInputRef.current?.blur();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Fetch notifications from API
  const fetchNotifications = useCallback(
    async (showRefreshToast = false) => {
      if (status !== "authenticated") return;

      try {
        if (showRefreshToast) setRefreshing(true);

        const params = new URLSearchParams();
        if (typeFilter) params.set("type", typeFilter);
        if (showUnreadOnly) params.set("unreadOnly", "true");

        const response = await fetch(`/api/notifications?${params.toString()}`);

        if (!response.ok) {
          throw new Error("Failed to fetch notifications");
        }

        const data = await response.json();
        setNotificationsList(data.notifications || []);
        setError(null);

        if (showRefreshToast) {
          toast.success("Notifications refreshed");
        }
      } catch (err) {
        console.error("Fetch notifications error:", err);
        setError("Failed to load notifications");
        toast.error("Failed to load notifications");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [status, typeFilter, showUnreadOnly]
  );

  // Initial fetch and refetch when filters change
  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    fetchNotifications();
  }, [status, router, fetchNotifications]);

  // WebSocket for real-time notifications
  const { isConnected } = useWebSocket({
    enabled: status === "authenticated",
    onNotification: (notification) => {
      if (notification.userId === session?.user?.id) {
        setNotificationsList((prev) => [notification, ...prev].slice(0, 50));
        toast.info("New notification received!");
      }
    },
  });

  // Mark single notification as read
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

      setNotificationsList((prev) =>
        prev.map((notif) =>
          notif.id === id
            ? { ...notif, unreadBool: false, unread: "false" }
            : notif
        )
      );
      toast.success("Marked as read");
    } catch (err) {
      console.error("Mark as read error:", err);
      toast.error("Failed to mark notification as read");
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      const response = await fetch("/api/notifications/mark-all-read", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to mark all as read");
      }

      const data = await response.json();

      setNotificationsList((prev) =>
        prev.map((notif) => ({ ...notif, unreadBool: false, unread: "false" }))
      );

      toast.success(data.message || "All notifications marked as read");
    } catch (err) {
      console.error("Mark all as read error:", err);
      toast.error("Failed to mark all as read");
    }
  };

  // Handle search
  const handleSearch = useCallback(() => {
    if (searchQuery.trim()) {
      toast.info(`Searching for "${searchQuery}"...`);
    }
  }, [searchQuery]);

  const getNotificationIcon = (type: Notification["type"]) => {
    const colorClass = TYPE_COLORS[type]?.icon || TYPE_COLORS.default.icon;
    switch (type) {
      case "message":
        return <MessageSquare className={`h-5 w-5 ${colorClass}`} />;
      case "appointment":
        return <Calendar className={`h-5 w-5 ${colorClass}`} />;
      case "payment":
        return <DollarSign className={`h-5 w-5 ${colorClass}`} />;
      case "profile_visit":
        return <Eye className={`h-5 w-5 ${colorClass}`} />;
      case "video_call":
        return <Video className={`h-5 w-5 ${colorClass}`} />;
      default:
        return <Bell className={`h-5 w-5 ${colorClass}`} />;
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
      case "video_call":
        return `/dashboard/video-call/${notif.relatedId}`;
      default:
        return null;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "profile_visit":
        return "Profile Visit";
      case "message":
        return "Message";
      case "appointment":
        return "Appointment";
      case "payment":
        return "Payment";
      case "video_call":
        return "Video Call";
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  // Filtered notifications
  const filteredNotifications = useMemo(() => {
    return notificationsList.filter((notif) =>
      searchQuery
        ? notif.content.toLowerCase().includes(searchQuery.toLowerCase())
        : true
    );
  }, [notificationsList, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const unread = notificationsList.filter((n) => n.unreadBool).length;
    const read = notificationsList.length - unread;
    const messages = notificationsList.filter(
      (n) => n.type === "message"
    ).length;
    const appointments = notificationsList.filter(
      (n) => n.type === "appointment"
    ).length;

    return {
      unread,
      read,
      messages,
      appointments,
      total: notificationsList.length,
    };
  }, [notificationsList]);

  // Loading state
  if (status === "loading" || loading) {
    return <NotificationsSkeleton />;
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <motion.div
      className="p-4 space-y-6 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
        <CardHeader className="pb-2">
          <motion.div variants={itemVariants}>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold text-black flex items-center gap-2">
                  <Bell className="h-6 w-6" />
                  Your Notifications
                  {isConnected && (
                    <span
                      className="h-2 w-2 bg-green-500 rounded-full animate-pulse"
                      title="Real-time connected"
                    />
                  )}
                </CardTitle>
                <p className="text-sm text-black/70 mt-1">
                  Stay updated with your activity •{" "}
                  {stats.unread > 0
                    ? `${stats.unread} unread`
                    : "All caught up!"}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchNotifications(true)}
                disabled={refreshing}
                className="rounded-full bg-white/80 hover:bg-white"
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>
          </motion.div>
        </CardHeader>
        <CardContent>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-white/80 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-red-500">{stats.unread}</p>
              <p className="text-xs text-gray-600 flex items-center justify-center gap-1">
                <Mail className="h-3 w-3" />
                Unread
              </p>
            </div>
            <div className="bg-white/80 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-600">{stats.read}</p>
              <p className="text-xs text-gray-600 flex items-center justify-center gap-1">
                <MailOpen className="h-3 w-3" />
                Read
              </p>
            </div>
            <div className="bg-white/80 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-blue-600">
                {stats.messages}
              </p>
              <p className="text-xs text-gray-600 flex items-center justify-center gap-1">
                <MessageSquare className="h-3 w-3" />
                Messages
              </p>
            </div>
            <div className="bg-white/80 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
              <p className="text-xs text-gray-600 flex items-center justify-center gap-1">
                <Inbox className="h-3 w-3" />
                Total
              </p>
            </div>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row items-center gap-2">
            {/* Search Input - Enhanced Pattern */}
            <div className="relative flex-grow w-full">
              <Search
                className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground pointer-events-none"
                aria-hidden="true"
              />
              <Input
                ref={searchInputRef}
                type="text"
                placeholder="Search notifications... (press / to focus)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-12 py-3 rounded-lg border bg-white shadow-sm focus:ring-2 focus:ring-[#F3CFC6]/50"
                data-search-input
                aria-label="Search notifications"
              />
              {/* Right side container */}
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center">
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded-sm hover:bg-muted"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                ) : (
                  <div className="hidden sm:flex items-center text-xs text-muted-foreground">
                    <Keyboard className="h-3 w-3 mr-1" aria-hidden="true" />
                    <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">
                      /
                    </kbd>
                  </div>
                )}
              </div>
            </div>

            {/* Search Button */}
            <Button
              onClick={handleSearch}
              className="w-full sm:w-auto bg-white hover:bg-white/80 text-gray-800 shadow-sm"
            >
              <Search className="mr-2 h-4 w-4" aria-hidden="true" />
              Search
            </Button>

            {/* Type Filter Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full sm:w-auto bg-white shadow-sm"
                >
                  <Filter className="mr-2 h-4 w-4" aria-hidden="true" />
                  {typeFilter ? getTypeLabel(typeFilter) : "All Types"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Filter by Type</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setTypeFilter("")}>
                  All
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {[
                  "message",
                  "appointment",
                  "payment",
                  "profile_visit",
                  "video_call",
                ].map((type) => {
                  const colors = TYPE_COLORS[type] || TYPE_COLORS.default;
                  return (
                    <DropdownMenuItem
                      key={type}
                      onSelect={() => setTypeFilter(type)}
                    >
                      <Badge className={`${colors.bg} ${colors.text} mr-2`}>
                        {getTypeLabel(type)}
                      </Badge>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Unread Toggle */}
            <Button
              variant="outline"
              onClick={() => setShowUnreadOnly(!showUnreadOnly)}
              className={`w-full sm:w-auto bg-white shadow-sm ${
                showUnreadOnly ? "ring-2 ring-[#F3CFC6]" : ""
              }`}
            >
              <Mail className="mr-2 h-4 w-4" />
              {showUnreadOnly ? "Show All" : "Unread Only"}
            </Button>

            {/* Mark All Read */}
            {stats.unread > 0 && (
              <Button
                variant="outline"
                onClick={markAllAsRead}
                className="w-full sm:w-auto bg-white shadow-sm hover:bg-green-50"
              >
                <CheckCheck className="mr-2 h-4 w-4 text-green-600" />
                Mark All Read
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-black">
            <Inbox className="mr-2 h-5 w-5 text-[#F3CFC6]" />
            All Notifications
            {filteredNotifications.length > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({filteredNotifications.length})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] pr-4">
            <motion.div className="space-y-3" variants={containerVariants}>
              <AnimatePresence>
                {error ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                    <Bell className="h-12 w-12 mb-3 opacity-50 text-red-400" />
                    <p className="text-lg font-medium text-red-500">{error}</p>
                    <Button
                      onClick={() => fetchNotifications()}
                      variant="outline"
                      className="mt-4"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Try Again
                    </Button>
                  </div>
                ) : filteredNotifications.length > 0 ? (
                  filteredNotifications.map((notif) => {
                    const link = getNotificationLink(notif);
                    const typeColors =
                      TYPE_COLORS[notif.type] || TYPE_COLORS.default;

                    return (
                      <motion.div
                        key={notif.id}
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        whileHover={{
                          scale: 1.01,
                          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        }}
                        transition={{ duration: 0.2 }}
                        className={`flex items-start sm:items-center justify-between p-4 border rounded-lg transition-all ${
                          notif.unreadBool
                            ? "bg-[#F3CFC6]/10 border-[#F3CFC6]/50"
                            : "bg-white border-gray-200 hover:border-[#F3CFC6]/30"
                        }`}
                      >
                        <div className="flex items-start sm:items-center gap-4 flex-1">
                          {/* Icon */}
                          <div
                            className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                              notif.unreadBool
                                ? "bg-[#F3CFC6]/30"
                                : "bg-gray-100"
                            }`}
                          >
                            {getNotificationIcon(notif.type)}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-sm ${
                                notif.unreadBool
                                  ? "font-semibold text-black"
                                  : "text-gray-700"
                              }`}
                            >
                              {notif.content}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <span className="text-xs text-gray-500">
                                {new Date(notif.timestamp).toLocaleString()}
                              </span>
                              <Badge
                                className={`${typeColors.bg} ${typeColors.text} text-[10px]`}
                              >
                                {getTypeLabel(notif.type)}
                              </Badge>
                              {notif.unreadBool && (
                                <span className="h-2 w-2 bg-red-500 rounded-full" />
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                          {notif.unreadBool && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsRead(notif.id)}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              <CheckCircle className="h-4 w-4" />
                              <span className="sr-only sm:not-sr-only sm:ml-1">
                                Read
                              </span>
                            </Button>
                          )}
                          {link && (
                            <Button
                              asChild
                              size="sm"
                              className="bg-[#F3CFC6] hover:bg-[#e9bfb5] text-gray-800"
                            >
                              <Link href={link}>
                                <Eye className="h-4 w-4 sm:mr-1" />
                                <span className="sr-only sm:not-sr-only">
                                  View
                                </span>
                              </Link>
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                    <Bell className="h-16 w-16 mb-4 opacity-30" />
                    <p className="text-lg font-medium">
                      No notifications found
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      {searchQuery || typeFilter || showUnreadOnly
                        ? "Try adjusting your filters"
                        : "You're all caught up!"}
                    </p>
                    {(searchQuery || typeFilter || showUnreadOnly) && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSearchQuery("");
                          setTypeFilter("");
                          setShowUnreadOnly(false);
                        }}
                        className="mt-4"
                      >
                        <X className="mr-2 h-4 w-4" />
                        Clear Filters
                      </Button>
                    )}
                  </div>
                )}
              </AnimatePresence>
            </motion.div>
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Skeleton loader
function NotificationsSkeleton() {
  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto">
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4]">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-8 w-48 bg-white/50" />
              <Skeleton className="h-4 w-64 mt-2 bg-white/50" />
            </div>
            <Skeleton className="h-9 w-24 rounded-full bg-white/50" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 rounded-lg bg-white/50" />
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Skeleton className="h-12 flex-1 bg-white/50" />
            <Skeleton className="h-12 w-24 bg-white/50" />
            <Skeleton className="h-12 w-28 bg-white/50" />
            <Skeleton className="h-12 w-28 bg-white/50" />
            <Skeleton className="h-12 w-32 bg-white/50" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
