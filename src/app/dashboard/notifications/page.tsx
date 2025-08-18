"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bell,
  CheckCircle,
  MessageSquare,
  Calendar,
  DollarSign,
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { io } from "socket.io-client";

// Type definitions based on schema
interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
}

interface Notification {
  id: string;
  type: "message" | "appointment" | "payment";
  content: string;
  timestamp: string;
  unread: boolean;
  relatedId?: string;
}

export default function NotificationsPage() {
  const [notificationsList, setNotificationsList] = useState<Notification[]>(
    []
  );
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    const socket = io(
      process.env.NEXT_PUBLIC_WEBSOCKET_URL || "http://localhost:3001"
    );
    socket.on("notification", (data: Notification) => {
      setNotificationsList((prev) => [data, ...prev].slice(0, 50)); // Limit to 50
    });
    return () => {
      socket.disconnect();
    };
  }, []);

  if (status === "loading") {
    return (
      <div className="p-4 space-y-6 max-w-7xl mx-auto">
        <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
          <CardHeader>
            <div className="flex items-center space-x-4">
              <Skeleton className="h-16 w-16 rounded-full bg-[#C4C4C4]/50" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-48 bg-[#C4C4C4]/50" />
                <Skeleton className="h-4 w-64 bg-[#C4C4C4]/50" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex space-x-4">
            <Skeleton className="h-10 w-40 rounded-full bg-[#C4C4C4]/50" />
            <Skeleton className="h-10 w-40 rounded-full bg-[#C4C4C4]/50" />
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader>
            <Skeleton className="h-8 w-48 bg-[#C4C4C4]/50" />
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            {[...Array(3)].map((_, idx) => (
              <Skeleton key={idx} className="h-16 w-full bg-[#C4C4C4]/50" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  const user: User = {
    id: session?.user?.id || "user_1",
    name: session?.user?.name || "User",
    email: session?.user?.email || "user@example.com",
    avatar: session?.user?.image || "/assets/images/avatar-placeholder.png",
  };

  const markAsRead = (id: string) => {
    setNotificationsList((prev) =>
      prev.map((notif) =>
        notif.id === id ? { ...notif, unread: false } : notif
      )
    );
  };

  const filteredNotifications = showUnreadOnly
    ? notificationsList.filter((notif) => notif.unread)
    : notificationsList;

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

  return (
    <motion.div
      className="p-4 space-y-6 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
        <CardHeader>
          <motion.div
            variants={itemVariants}
            className="flex items-center space-x-4"
          >
            <Avatar className="h-16 w-16 border-2 border-white">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="bg-[#C4C4C4] text-black">
                {user.name[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-2xl text-black dark:text-white">
                Notifications
              </CardTitle>
              <p className="text-sm text-[#C4C4C4]">
                Stay updated with your activity
              </p>
            </div>
          </motion.div>
        </CardHeader>
        <CardContent className="flex space-x-4">
          <motion.div
            variants={itemVariants}
            whileHover={{
              scale: 1.05,
              boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
            }}
            transition={{ duration: 0.2 }}
          >
            <Button
              asChild
              variant="outline"
              className="text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20 rounded-full"
            >
              <Link href="/dashboard">
                <MessageSquare className="mr-2 h-4 w-4 text-[#F3CFC6]" />
                Back to Dashboard
              </Link>
            </Button>
          </motion.div>
          <motion.div
            variants={itemVariants}
            whileHover={{
              scale: 1.05,
              boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
            }}
            transition={{ duration: 0.2 }}
          >
            <Button
              variant="outline"
              onClick={() => setShowUnreadOnly(!showUnreadOnly)}
              className="text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20 rounded-full"
            >
              {showUnreadOnly ? "Show All" : "Show Unread Only"}
            </Button>
          </motion.div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-black dark:text-white">
            <Bell className="mr-2 h-5 w-5 text-[#F3CFC6]" />
            Your Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <ScrollArea className="h-[400px]">
            <motion.div className="space-y-4" variants={containerVariants}>
              <AnimatePresence>
                {filteredNotifications.length ? (
                  filteredNotifications.map((notif) => (
                    <motion.div
                      key={notif.id}
                      variants={itemVariants}
                      initial="hidden"
                      animate="visible"
                      exit={{ opacity: 0, x: -20 }}
                      className="flex items-center justify-between p-4 hover:bg-[#F3CFC6]/10 dark:hover:bg-[#C4C4C4]/10 rounded-md border border-[#F3CFC6]"
                    >
                      <div className="flex items-center space-x-3">
                        {notif.type === "message" && (
                          <MessageSquare className="h-5 w-5 text-[#F3CFC6]" />
                        )}
                        {notif.type === "appointment" && (
                          <Calendar className="h-5 w-5 text-[#F3CFC6]" />
                        )}
                        {notif.type === "payment" && (
                          <DollarSign className="h-5 w-5 text-[#F3CFC6]" />
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
                            className="text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20 rounded-full"
                          >
                            <CheckCircle className="h-4 w-4 mr-1 text-[#F3CFC6]" />
                            Mark as Read
                          </Button>
                        )}
                        {notif.relatedId && (
                          <Button
                            asChild
                            variant="link"
                            size="sm"
                            className="text-[#F3CFC6] hover:text-[#C4C4C4]"
                          >
                            <Link
                              href={
                                notif.type === "message"
                                  ? `/messaging/${notif.relatedId}`
                                  : notif.type === "appointment"
                                    ? `/appointments/${notif.relatedId}`
                                    : `/payment/${notif.relatedId}`
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
                  <p className="text-[#C4C4C4] text-center">
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
