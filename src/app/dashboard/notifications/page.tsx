/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
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
  relatedId?: string; // Links to message, appointment, or payment
}

// Dummy data
const notifications: Notification[] = [
  {
    id: "1",
    type: "message",
    content:
      "New message from Dr. Sarah Johnson: 'Please review our session notes.'",
    timestamp: "2025-08-08 09:00 AM",
    unread: true,
    relatedId: "msg_1",
  },
  {
    id: "2",
    type: "appointment",
    content:
      "Upcoming video session with Dr. Emily Carter on 2025-08-09 at 2:00 PM.",
    timestamp: "2025-08-07 10:30 AM",
    unread: true,
    relatedId: "appt_1",
  },
  {
    id: "3",
    type: "payment",
    content: "Payment of $100 processed for session with Dr. Michael Brown.",
    timestamp: "2025-08-06 3:15 PM",
    unread: false,
    relatedId: "pay_1",
  },
];

// Animation variants
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

export default function NotificationsPage() {
  const [notificationsList, setNotificationsList] =
    useState<Notification[]>(notifications);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === "loading") {
    return <div className="p-4">Loading...</div>;
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

  return (
    <motion.div
      className="p-4 space-y-6 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header Section */}
      <Card>
        <CardHeader>
          <motion.div
            variants={itemVariants}
            className="flex items-center space-x-4"
          >
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback>{user.name[0]}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-2xl">Notifications</CardTitle>
              <p className="text-muted-foreground">
                Stay updated with your activity
              </p>
            </div>
          </motion.div>
        </CardHeader>
        <CardContent className="flex space-x-4">
          <motion.div variants={itemVariants}>
            <Button asChild variant="outline">
              <Link href="/dashboard">
                <MessageSquare className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Button
              variant="outline"
              onClick={() => setShowUnreadOnly(!showUnreadOnly)}
            >
              {showUnreadOnly ? "Show All" : "Show Unread Only"}
            </Button>
          </motion.div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="mr-2 h-5 w-5" />
            Your Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
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
                      className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-md border"
                    >
                      <div className="flex items-center space-x-3">
                        {notif.type === "message" && (
                          <MessageSquare className="h-5 w-5 text-muted-foreground" />
                        )}
                        {notif.type === "appointment" && (
                          <Calendar className="h-5 w-5 text-muted-foreground" />
                        )}
                        {notif.type === "payment" && (
                          <DollarSign className="h-5 w-5 text-muted-foreground" />
                        )}
                        <div>
                          <p className="text-sm">{notif.content}</p>
                          <p className="text-xs text-muted-foreground">
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
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Mark as Read
                          </Button>
                        )}
                        {notif.relatedId && (
                          <Button asChild variant="link" size="sm">
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
                  <p className="text-muted-foreground text-center">
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
