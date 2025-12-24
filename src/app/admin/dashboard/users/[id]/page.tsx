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
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface User {
  id: string;
  name: string;
  email: string;
  status: "active" | "suspended";
  profileImage?: string;
  phoneNumber?: string;
  firstName?: string;
  lastName?: string;
}

interface Appointment {
  _id: string;
  professionalName: string;
  date: string;
  time: string;
  location: string;
  status: "upcoming" | "completed" | "cancelled";
}

interface VideoSession {
  _id: string;
  professionalName: string;
  date: string;
  time: string;
  status: "upcoming" | "completed" | "cancelled";
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

// Dummy video sessions data
const dummyVideoSessions: VideoSession[] = [
  {
    _id: "vid_1",
    professionalName: "Dr. Sarah",
    date: "2025-08-10",
    time: "14:00",
    status: "completed",
  },
  {
    _id: "vid_2",
    professionalName: "Dr. John",
    date: "2025-08-12",
    time: "10:30",
    status: "upcoming",
  },
];

export default function UserDetailPage() {
  const { id } = useParams();
  const [user, setUser] = useState<User | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [videoSessions, setVideoSessions] = useState<VideoSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        // Fetch user
        const userResponse = await fetch(`/api/users/${id}`);
        if (!userResponse.ok) {
          throw new Error("Failed to fetch user");
        }
        const userData = await userResponse.json();
        setUser(userData);

        // Fetch appointments for the specific user
        const apptResponse = await fetch(`/api/appointment?userId=${id}`);
        if (!apptResponse.ok) {
          throw new Error("Failed to fetch appointments");
        }
        const apptData = await apptResponse.json();
        setAppointments(apptData);

        // Use dummy video sessions
        setVideoSessions(dummyVideoSessions);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load user data");
      } finally {
        setLoading(false);
      }
    };
    if (id) {
      fetchUserData();
    }
  }, [id]);

  const handleStatusChange = async (newStatus: "active" | "suspended") => {
    try {
      const response = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) {
        throw new Error("Failed to update status");
      }
      const updatedUser = await response.json();
      setUser(updatedUser);
      toast.success(`User status updated to ${newStatus}`);
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update user status");
    }
  };

  if (loading) {
    return <div className="p-4 text-center">Loading...</div>;
  }

  if (!user) {
    return <div className="p-4 text-center">User not found</div>;
  }

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
                src={
                  user.profileImage || "/assets/images/avatar-placeholder.png"
                }
                alt={user.name}
                className="object-cover"
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
              className="border-[#F3CFC6] text-[#F3CFC6] hover:bg-[#fff]/80 dark:bg-black/80 dark:hover:bg-gray-700"
              disabled={user.status === "active"}
              onClick={() => handleStatusChange("active")}
            >
              Activate
            </Button>
            <Button
              variant="outline"
              className="border-[#F3CFC6] text-[#F3CFC6] hover:bg-[#fff]/80 dark:bg-black/80 dark:hover:bg-gray-700"
              disabled={user.status === "suspended"}
              onClick={() => handleStatusChange("suspended")}
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
                <p>First Name: {user.firstName}</p>
                <p>Last Name: {user.lastName}</p>
                <p>Email: {user.email}</p>
                <p>Phone: {user.phoneNumber}</p>
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
                  {appointments.length > 0 ? (
                    appointments.map((appt) => (
                      <motion.div
                        key={appt._id}
                        variants={itemVariants}
                        className="p-4 hover:bg-[#F3CFC6]/10 dark:hover:bg-[#C4C4C4]/10 transition-colors"
                      >
                        <p className="flex items-center text-black dark:text-white">
                          <Calendar className="mr-2 h-4 w-4 text-[#F3CFC6]" />
                          {appt.professionalName} - {appt.date} {appt.time} (
                          {appt.status})
                        </p>
                      </motion.div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-[#C4C4C4]">
                      No appointments found
                    </div>
                  )}
                </AnimatePresence>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="videos">
              <ScrollArea className="h-[200px]">
                <AnimatePresence>
                  {videoSessions.length > 0 ? (
                    videoSessions.map((session) => (
                      <motion.div
                        key={session._id}
                        variants={itemVariants}
                        className="p-4 hover:bg-[#F3CFC6]/10 dark:hover:bg-[#C4C4C4]/10 transition-colors"
                      >
                        <p className="flex items-center text-black dark:text-white">
                          <Video className="mr-2 h-4 w-4 text-[#F3CFC6]" />
                          {session.professionalName} - {session.date}{" "}
                          {session.time} ({session.status})
                        </p>
                      </motion.div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-[#C4C4C4]">
                      No video sessions found
                    </div>
                  )}
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
