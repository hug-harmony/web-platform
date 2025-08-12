"use client";

import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { User, Calendar, Video, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface User {
  id: string;
  name: string;
  email: string;
  status: "active" | "suspended";
}

interface Appointment {
  id: string;
  specialist: string;
  date: string;
}

interface VideoSession {
  id: string;
  specialist: string;
  date: string;
}

const user: User = {
  id: "user_1",
  name: "John Doe",
  email: "john@example.com",
  status: "active",
};

const appointments: Appointment[] = [
  { id: "appt_1", specialist: "Dr. Sarah", date: "2025-08-15" },
];

const videoSessions: VideoSession[] = [
  { id: "vid_1", specialist: "Dr. Sarah", date: "2025-08-10" },
];

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

export default function UserDetailPage() {
  const { id } = useParams();

  return (
    <motion.div
      className="space-y-6 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[#C4C4C4]">
        <Link href="/admin/dashboard/users" className="hover:text-[#F3CFC6]">
          Users
        </Link>
        <span>/</span>
        <span>{user.name}</span>
      </div>

      {/* Profile Summary */}
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] text-black dark:text-white shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-white">
              <AvatarImage
                src="/assets/images/avatar-placeholder.png"
                alt={user.name}
              />
              <AvatarFallback className="bg-[#C4C4C4] text-black">
                {user.name[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-2xl font-bold flex items-center">
                <User className="mr-2 h-6 w-6" />
                {user.name}
              </CardTitle>
              <p className="text-sm opacity-80">User Profile</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="space-y-2">
            <p>Email: {user.email}</p>
            <p>
              Status:{" "}
              <span
                className={
                  user.status === "active" ? "text-green-500" : "text-red-500"
                }
              >
                {user.status}
              </span>
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="border-[#F3CFC6] text-[#F3CFC6] hover:bg-[#F3CFC6]/20"
              disabled={user.status === "active"}
            >
              Activate
            </Button>
            <Button
              variant="outline"
              className="border-[#F3CFC6] text-[#F3CFC6] hover:bg-[#F3CFC6]/20"
              disabled={user.status === "suspended"}
            >
              Suspend
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Additional Info */}
      <Card>
        <CardContent className="p-0">
          <Tabs defaultValue="details" className="p-4">
            <TabsList className="bg-[#F3CFC6]/20 dark:bg-[#C4C4C4]/20">
              <TabsTrigger
                value="details"
                className="data-[state=active]:bg-[#F3CFC6] data-[state=active]:text-black dark:data-[state=active]:text-white"
              >
                Details
              </TabsTrigger>
              <TabsTrigger
                value="appointments"
                className="data-[state=active]:bg-[#F3CFC6] data-[state=active]:text-black dark:data-[state=active]:text-white"
              >
                Appointments
              </TabsTrigger>
              <TabsTrigger
                value="videos"
                className="data-[state=active]:bg-[#F3CFC6] data-[state=active]:text-black dark:data-[state=active]:text-white"
              >
                Video Sessions
              </TabsTrigger>
            </TabsList>
            <TabsContent value="details">
              <div className="p-4 space-y-2 text-black dark:text-white">
                <p>Email: {user.email}</p>
                <p>
                  Status:{" "}
                  <span
                    className={
                      user.status === "active"
                        ? "text-green-500"
                        : "text-red-500"
                    }
                  >
                    {user.status}
                  </span>
                </p>
              </div>
            </TabsContent>
            <TabsContent value="appointments">
              <ScrollArea className="h-[200px]">
                <AnimatePresence>
                  {appointments.map((appt) => (
                    <motion.div
                      key={appt.id}
                      variants={itemVariants}
                      className="p-4 hover:bg-[#F3CFC6]/10 dark:hover:bg-[#C4C4C4]/10 transition-colors"
                    >
                      <p className="flex items-center text-black dark:text-white">
                        <Calendar className="mr-2 h-4 w-4 text-[#F3CFC6]" />
                        {appt.specialist} - {appt.date}
                      </p>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="videos">
              <ScrollArea className="h-[200px]">
                <AnimatePresence>
                  {videoSessions.map((vid) => (
                    <motion.div
                      key={vid.id}
                      variants={itemVariants}
                      className="p-4 hover:bg-[#F3CFC6]/10 dark:hover:bg-[#C4C4C4]/10 transition-colors"
                    >
                      <p className="flex items-center text-black dark:text-white">
                        <Video className="mr-2 h-4 w-4 text-[#F3CFC6]" />
                        {vid.specialist} - {vid.date}
                      </p>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Button
        asChild
        variant="link"
        className="text-[#F3CFC6] hover:text-[#F3CFC6]/80"
      >
        <Link href="/admin/dashboard/users">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Users
        </Link>
      </Button>
    </motion.div>
  );
}
