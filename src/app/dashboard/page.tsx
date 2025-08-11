/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Calendar,
  MessageSquare,
  Clock,
  User,
  Video,
  DollarSign,
  UserStar,
  UserRoundSearch,
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { notFound } from "next/navigation";

// Type definitions
interface User {
  id: string;
  name: string;
  email: string;
  profileImage?: string | null;
}

interface Message {
  id: number;
  therapist: string;
  message: string;
  time: string;
  unread: boolean;
}

// Dummy data (unchanged)
const recentMessages: Message[] = [
  {
    id: 1,
    therapist: "Dr. Sarah Johnson",
    message: "Looking forward to our session tomorrow!",
    time: "2025-08-04 14:30",
    unread: true,
  },
  {
    id: 2,
    therapist: "Dr. Michael Brown",
    message: "Please review the notes from our last session.",
    time: "2025-08-03 09:15",
    unread: false,
  },
];

const appointments = {
  upcoming: [
    {
      id: 1,
      therapist: "Dr. Sarah Johnson",
      date: "2025-08-06",
      time: "10:00 AM",
      type: "Video Session",
    },
    {
      id: 2,
      therapist: "Dr. Emily Carter",
      date: "2025-08-08",
      time: "2:00 PM",
      type: "In-Person",
    },
  ],
  past: [
    {
      id: 3,
      therapist: "Dr. Michael Brown",
      date: "2025-07-30",
      time: "11:00 AM",
      type: "Video Session",
    },
  ],
};

// Animation variants
const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      staggerChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      if (status === "loading") return;
      if (status === "unauthenticated") {
        router.push("/login");
        return;
      }

      try {
        const id = session?.user?.id; // Assuming session.user.id is available
        if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
          console.error("Invalid user ID format:", id);
          notFound();
        }

        const res = await fetch(`/api/users/${id}`, {
          cache: "no-store",
          credentials: "include",
        });

        if (res.ok) {
          const data = await res.json();
          setUser({
            id: data.id,
            name:
              data.firstName && data.lastName
                ? `${data.firstName} ${data.lastName}`
                : data.name || "User",
            email: data.email || "user@example.com",
            profileImage: data.profileImage || null,
          });
        } else {
          console.error("User API response:", res.status, await res.text());
          if (res.status === 401) router.push("/login");
          if (res.status === 404) notFound();
          throw new Error(`Failed to fetch user: ${res.status}`);
        }
      } catch (err: any) {
        console.error("Fetch User Error:", err.message, err.stack);
        setError("Failed to load user data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [status, session, router]);

  if (status === "loading" || loading) {
    return <div className="p-4">Loading...</div>;
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  if (error || !user) {
    return (
      <div className="text-center p-6 text-red-500">
        {error || "User data not found."}
      </div>
    );
  }

  return (
    <motion.div
      className="p-4 space-y-6 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Hero Section */}
      <Card>
        <CardHeader>
          <motion.div
            variants={itemVariants}
            className="flex items-center space-x-4"
          >
            <Avatar className="h-16 w-16">
              {user.profileImage ? (
                <AvatarImage src={user.profileImage} alt={user.name} />
              ) : (
                <AvatarFallback className="bg-gray-200 text-gray-600 flex items-center justify-center">
                  <User className="h-10 w-10" />
                </AvatarFallback>
              )}
            </Avatar>
            <div>
              <CardTitle className="text-2xl">Welcome, {user.name}!</CardTitle>
              <p className="text-muted-foreground">{user.email}</p>
            </div>
          </motion.div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <motion.div variants={itemVariants}>
            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard/specialists">
                <UserStar className="mr-2 h-4 w-4" />
                Find a Professional
              </Link>
            </Button>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard/explore">
                <UserRoundSearch className="mr-2 h-4 w-4" />
                Explore Users
              </Link>
            </Button>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard/video-session">
                <Video className="mr-2 h-4 w-4" />
                Join Video Session
              </Link>
            </Button>
          </motion.div>
        </CardContent>
      </Card>

      {/* Recent Messages */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageSquare className="mr-2 h-5 w-5" />
            Recent Messages
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[200px]">
            <motion.div className="space-y-4" variants={containerVariants}>
              <AnimatePresence>
                {recentMessages.length ? (
                  recentMessages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      variants={itemVariants}
                      initial="hidden"
                      animate="visible"
                      exit={{ opacity: 0, x: -20 }}
                      className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md"
                    >
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {msg.therapist.split(" ")[1]?.[0] || "T"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{msg.therapist}</p>
                          <p className="text-sm text-muted-foreground">
                            {msg.message}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          {msg.time}
                        </p>
                        {msg.unread && (
                          <Badge variant="destructive">Unread</Badge>
                        )}
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <p className="text-muted-foreground">
                    No messages available.
                  </p>
                )}
              </AnimatePresence>
            </motion.div>
          </ScrollArea>
          <Button asChild variant="link" className="mt-4">
            <Link href="/messaging">View All Messages</Link>
          </Button>
        </CardContent>
      </Card>

      {/* Appointments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="mr-2 h-5 w-5" />
            Your Appointments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeTab}
            onValueChange={(value) =>
              setActiveTab(value as "upcoming" | "past")
            }
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="past">Past</TabsTrigger>
            </TabsList>
            <TabsContent value="upcoming">
              <motion.div className="space-y-4" variants={containerVariants}>
                <AnimatePresence>
                  {appointments.upcoming.length ? (
                    appointments.upcoming.map((appt) => (
                      <motion.div
                        key={appt.id}
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        exit={{ opacity: 0, x: -20 }}
                        className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md"
                      >
                        <div>
                          <p className="font-semibold">{appt.therapist}</p>
                          <p className="text-sm text-muted-foreground">
                            {appt.date} at {appt.time} - {appt.type}
                          </p>
                        </div>
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/dashboard/appointments`}>Details</Link>
                        </Button>
                      </motion.div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">
                      No upcoming appointments.
                    </p>
                  )}
                </AnimatePresence>
              </motion.div>
            </TabsContent>
            <TabsContent value="past">
              <motion.div className="space-y-4" variants={containerVariants}>
                <AnimatePresence>
                  {appointments.past.length ? (
                    appointments.past.map((appt) => (
                      <motion.div
                        key={appt.id}
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        exit={{ opacity: 0, x: -20 }}
                        className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md"
                      >
                        <div>
                          <p className="font-semibold">{appt.therapist}</p>
                          <p className="text-sm text-muted-foreground">
                            {appt.date} at {appt.time} - {appt.type}
                          </p>
                        </div>
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/appointments/${appt.id}`}>Details</Link>
                        </Button>
                      </motion.div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">
                      No past appointments.
                    </p>
                  )}
                </AnimatePresence>
              </motion.div>
            </TabsContent>
          </Tabs>
          <Button asChild variant="link" className="mt-4">
            <Link href="/appointments">View All Appointments</Link>
          </Button>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <motion.div variants={itemVariants}>
            <Button asChild variant="outline" className="w-full">
              <Link href="/payment">
                <DollarSign className="mr-2 h-4 w-4" />
                View Payments
              </Link>
            </Button>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Button asChild variant="outline" className="w-full">
              <Link href="/notes-history">
                <MessageSquare className="mr-2 h-4 w-4" />
                Notes & Journal
              </Link>
            </Button>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
