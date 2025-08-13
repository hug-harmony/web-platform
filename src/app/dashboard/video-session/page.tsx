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

// Type definitions
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
    return <div className="p-4 text-center">Loading...</div>;
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
      className="space-y-6 w-full max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header Section */}
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] text-black dark:text-white shadow-lg">
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
              <CardTitle className="text-2xl font-bold">
                Video Sessions
              </CardTitle>
              <p className="text-sm opacity-80">
                Manage your video appointments with ease
              </p>
            </div>
          </motion.div>
        </CardHeader>
        <CardContent className="flex space-x-4">
          {[
            {
              href: "/dashboard",
              label: "Back to Dashboard",
              icon: <MessageSquare className="mr-2 h-6 w-6 text-[#F3CFC6]" />,
            },
            {
              href: "/booking",
              label: "Book Appointment",
              icon: <Calendar className="mr-2 h-6 w-6 text-[#F3CFC6]" />,
            },
          ].map((item) => (
            <motion.div
              key={item.href}
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
                className="text-[#F3CFC6] border-[#F3CFC6]"
              >
                <Link href={item.href}>
                  {item.icon} {item.label}
                </Link>
              </Button>
            </motion.div>
          ))}
        </CardContent>
      </Card>

      {/* Video Sessions Tabs */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-black dark:text-white">
            <Video className="mr-2 h-6 w-6 text-[#F3CFC6]" />
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
            <TabsList className="grid w-full grid-cols-2 bg-[#F3CFC6]/20 dark:bg-[#C4C4C4]/20">
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
                        className="flex items-center justify-between p-2 hover:bg-[#F3CFC6]/10 dark:hover:bg-[#C4C4C4]/10 rounded-md"
                      >
                        <div>
                          <p className="font-semibold text-black dark:text-white">
                            {session.specialist.name}
                          </p>
                          <p className="text-sm text-[#C4C4C4]">
                            {session.date} at {session.time}
                          </p>
                        </div>
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="text-[#F3CFC6] border-[#F3CFC6]"
                        >
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
                        className="flex items-center justify-between p-2 hover:bg-[#F3CFC6]/10 dark:hover:bg-[#C4C4C4]/10 rounded-md"
                      >
                        <div>
                          <p className="font-semibold text-black dark:text-white">
                            {session.specialist.name}
                          </p>
                          <p className="text-sm text-[#C4C4C4]">
                            {session.date} at {session.time} - {session.status}
                          </p>
                        </div>
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="text-[#F3CFC6] border-[#F3CFC6]"
                        >
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
