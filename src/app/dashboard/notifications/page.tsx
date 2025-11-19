"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bell,
  CheckCircle,
  MessageSquare,
  Calendar,
  DollarSign,
  Search,
  Filter,
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
import { supabase } from "@/lib/supabase";

interface Notification {
  id: string;
  type: "message" | "appointment" | "payment";
  content: string;
  timestamp: string;
  unread: boolean;
  relatedid?: string;
}

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

export default function NotificationsPage() {
  const [notificationsList, setNotificationsList] = useState<Notification[]>(
    []
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!supabase) {
      setError("Notifications unavailable: Supabase configuration missing");
      setLoading(false);
      return;
    }

    const fetchNotifications = async () => {
      try {
        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .order("timestamp", { ascending: false })
          .limit(50);
        if (error) {
          throw new Error("Failed to load notifications");
        }
        setNotificationsList(Array.isArray(data) ? data : []);
        setError(null);
      } catch (error) {
        console.error("Fetch notifications error:", error);
        setError("Failed to load notifications");
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();

    const channel = supabase
      .channel("notifications-channel")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotificationsList((prev) => [newNotif, ...prev].slice(0, 50));
        }
      )
      .subscribe((status) => console.log("subscription:", status));

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleTypeFilterChange = (value: string) => {
    setTypeFilter(value);
  };

  const markAsRead = async (id: string) => {
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ unread: false })
        .eq("id", id);
      if (error) {
        throw new Error("Failed to mark as read");
      }
      setNotificationsList((prev) =>
        prev.map((notif) =>
          notif.id === id ? { ...notif, unread: false } : notif
        )
      );
    } catch (error) {
      console.error("Mark as read error:", error);
    }
  };

  const filterNotifications = (data: Notification[]) =>
    data
      .filter((notif) =>
        searchQuery
          ? notif.content.toLowerCase().includes(searchQuery.toLowerCase())
          : true
      )
      .filter((notif) => (typeFilter ? notif.type === typeFilter : true))
      .filter((notif) => (showUnreadOnly ? notif.unread : true));

  const filteredNotifications = filterNotifications(notificationsList);

  if (status === "loading" || loading) {
    return (
      <motion.div
        className="p-4 space-y-6 max-w-7xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
          <CardHeader>
            <Skeleton className="h-8 w-48 bg-[#C4C4C4]/50" />
            <Skeleton className="h-4 w-64 mt-2 bg-[#C4C4C4]/50" />
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            <Skeleton className="h-10 w-full sm:w-2/3 bg-[#C4C4C4]/50" />
            <Skeleton className="h-10 w-full sm:w-1/3 bg-[#C4C4C4]/50" />
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader>
            <Skeleton className="h-8 w-48 bg-[#C4C4C4]/50" />
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, idx) => (
                <Skeleton
                  key={idx}
                  className="h-24 w-full bg-[#C4C4C4]/50 rounded-lg"
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  return (
    <motion.div
      className="p-4 space-y-6 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
        <CardHeader>
          <motion.div variants={itemVariants}>
            <CardTitle className="text-2xl font-bold text-black dark:text-white">
              Your Notifications
            </CardTitle>
            <p className="text-sm opacity-80">
              Stay updated with your activity
            </p>
          </motion.div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center mb-6 w-full space-y-2 sm:space-y-0 sm:space-x-2">
            <div className="relative flex-grow w-full">
              <Search className="absolute left-3 top-1/2 h-6 w-6 -translate-y-1/2 text-[#fff]" />
              <Input
                type="text"
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="p-2 pl-10 rounded border-[#F3CFC6] text-black dark:text-white focus:ring-[#F3CFC6]"
              />
            </div>
            <div className="flex space-x-2 w-full sm:w-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex items-center space-x-2 text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20 w-full sm:w-auto"
                  >
                    <Filter className="h-6 w-6 text-[#F3CFC6]" />
                    <span>Type</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-white dark:bg-gray-800">
                  <DropdownMenuLabel className="text-black dark:text-white">
                    Filter by Type
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleTypeFilterChange("")}
                    className="text-black dark:text-white hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20"
                  >
                    All
                  </DropdownMenuItem>
                  {["message", "appointment", "payment"].map((type) => (
                    <DropdownMenuItem
                      key={type}
                      onClick={() => handleTypeFilterChange(type)}
                      className="text-black dark:text-white hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20"
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="outline"
                onClick={() => setShowUnreadOnly(!showUnreadOnly)}
                className="text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20 w-full sm:w-auto"
              >
                {showUnreadOnly ? "Show All" : "Show Unread Only"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-black dark:text-white">
            <Bell className="mr-2 h-6 w-6 text-[#F3CFC6]" />
            All Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <ScrollArea className="h-[400px]">
            <motion.div className="space-y-4" variants={containerVariants}>
              <AnimatePresence>
                {error ? (
                  <p className="text-center text-[#C4C4C4]">{error}</p>
                ) : filteredNotifications.length > 0 ? (
                  filteredNotifications.map((notif) => (
                    <motion.div
                      key={notif.id}
                      variants={cardVariants}
                      whileHover={{
                        scale: 1.05,
                        boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
                      }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center justify-between p-4 hover:bg-[#F3CFC6]/10 dark:hover:bg-[#C4C4C4]/10 rounded-md"
                    >
                      <div className="flex items-center space-x-3">
                        {notif.type === "message" && (
                          <MessageSquare className="h-6 w-6 text-[#F3CFC6]" />
                        )}
                        {notif.type === "appointment" && (
                          <Calendar className="h-6 w-6 text-[#F3CFC6]" />
                        )}
                        {notif.type === "payment" && (
                          <DollarSign className="h-6 w-6 text-[#F3CFC6]" />
                        )}
                        <div>
                          <p className="text-sm text-black dark:text-white">
                            {notif.content}
                          </p>
                          <p className="text-xs text-[#C4C4C4]">
                            {notif.timestamp}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {notif.unread && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => markAsRead(notif.id)}
                            className="text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20"
                          >
                            <CheckCircle className="h-4 w-4 mr-1 text-[#F3CFC6]" />
                            Mark as Read
                          </Button>
                        )}
                        {notif.relatedid && (
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20"
                          >
                            <Link
                              href={
                                notif.type === "message"
                                  ? `/dashboard/messaging/${notif.relatedid}`
                                  : notif.type === "appointment"
                                    ? `/dashboard/appointments/${notif.relatedid}`
                                    : `/dashboard/payment/${notif.relatedid}`
                              }
                            >
                              View
                            </Link>
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <p className="text-center text-[#C4C4C4]">
                    No notifications found.
                  </p>
                )}
              </AnimatePresence>
            </motion.div>
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  );
}
