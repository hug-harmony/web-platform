/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Video, Calendar, MessageSquare } from "lucide-react";
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

interface VideoSession {
  id: string;
  specialist: {
    name: string;
    id: string;
  };
  date: string;
  time: string;
  status: "upcoming" | "completed" | "cancelled";
  joinUrl?: string;
}

// Dummy data
const videoSessions: VideoSession[] = [
  {
    id: "appt_1",
    specialist: { name: "Dr. Sarah Johnson", id: "spec_1" },
    date: "2025-08-09",
    time: "10:00 AM",
    status: "upcoming",
    joinUrl: "https://video.example.com/join/appt_1",
  },
  {
    id: "appt_2",
    specialist: { name: "Dr. Michael Brown", id: "spec_2" },
    date: "2025-08-01",
    time: "11:00 AM",
    status: "completed",
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

export default function VideoSessionsPage() {
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
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
              <CardTitle className="text-2xl">Video Sessions</CardTitle>
              <p className="text-muted-foreground">
                Manage your video appointments
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
            <Button asChild variant="outline">
              <Link href="/booking">
                <Calendar className="mr-2 h-4 w-4" />
                Book Appointment
              </Link>
            </Button>
          </motion.div>
        </CardContent>
      </Card>

      {/* Video Sessions Tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Video className="mr-2 h-5 w-5" />
            Your Video Sessions
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
                  {videoSessions
                    .filter((session) => session.status === "upcoming")
                    .map((session) => (
                      <motion.div
                        key={session.id}
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        exit={{ opacity: 0, x: -20 }}
                        className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md"
                      >
                        <div>
                          <p className="font-semibold">
                            {session.specialist.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {session.date} at {session.time}
                          </p>
                        </div>
                        <Button asChild variant="outline" size="sm">
                          <Link href={session.joinUrl || "#"}>
                            Join Session
                          </Link>
                        </Button>
                      </motion.div>
                    ))}
                </AnimatePresence>
              </motion.div>
            </TabsContent>
            <TabsContent value="past">
              <motion.div className="space-y-4" variants={containerVariants}>
                <AnimatePresence>
                  {videoSessions
                    .filter((session) => session.status !== "upcoming")
                    .map((session) => (
                      <motion.div
                        key={session.id}
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        exit={{ opacity: 0, x: -20 }}
                        className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md"
                      >
                        <div>
                          <p className="font-semibold">
                            {session.specialist.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {session.date} at {session.time} - {session.status}
                          </p>
                        </div>
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/appointments/${session.id}`}>
                            Details
                          </Link>
                        </Button>
                      </motion.div>
                    ))}
                </AnimatePresence>
              </motion.div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  );
}
