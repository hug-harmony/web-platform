/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Stethoscope, Calendar, Video, ArrowLeft } from "lucide-react";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface Specialist {
  id: string;
  name: string;
  specialty: string;
  location: string;
  biography: string;
  education: string;
  license: string;
  status: "pending" | "reviewed" | "approved" | "rejected";
}

interface Appointment {
  id: string;
  user: { name: string };
  date: string;
  time: string;
  status: "upcoming" | "completed" | "cancelled";
}

interface VideoSession {
  id: string;
  user: string;
  date: string;
  time: string;
  status: "upcoming" | "completed" | "cancelled";
}

// Dummy video sessions data
const dummyVideoSessions: VideoSession[] = [
  {
    id: "vid_1",
    user: "John Doe",
    date: "2025-08-10",
    time: "14:00",
    status: "completed",
  },
  {
    id: "vid_2",
    user: "Jane Smith",
    date: "2025-08-12",
    time: "10:30",
    status: "upcoming",
  },
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

export default function SpecialistDetailPage() {
  const { id } = useParams();
  const [specialist, setSpecialist] = useState<Specialist | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [videoSessions, setVideoSessions] = useState<VideoSession[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch specialist and appointments data
  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch specialist
        const specialistResponse = await fetch(
          `/api/specialists/application?id=${id}`
        );
        if (!specialistResponse.ok)
          throw new Error("Failed to fetch specialist");
        const specialistData = await specialistResponse.json();
        setSpecialist({
          id: specialistData.id,
          name: specialistData.name,
          specialty: specialistData.role,
          status: specialistData.status,
          location: specialistData.location,
          biography: specialistData.biography,
          education: specialistData.education, // Fixed typo
          license: specialistData.license,
        });

        // Fetch appointments for the specific specialist
        const apptResponse = await fetch(`/api/appointment?specialistId=${id}`);
        if (!apptResponse.ok) throw new Error("Failed to fetch appointments");
        const apptData = await apptResponse.json();
        setAppointments(apptData);

        // Use dummy video sessions
        setVideoSessions(dummyVideoSessions);
      } catch (error) {
        toast.error("Failed to load specialist data");
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchData();
  }, [id]);

  // Handle status update
  const handleStatusChange = async (
    newStatus: "pending" | "reviewed" | "approved" | "rejected"
  ) => {
    try {
      const response = await fetch("/api/specialists/application", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (!response.ok) throw new Error("Failed to update status");
      const updatedApplication = await response.json();
      setSpecialist((prev) =>
        prev ? { ...prev, status: updatedApplication.status } : prev
      );
      toast.success("Status updated successfully");
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  if (loading) return <div className="p-4 text-center">Loading...</div>;
  if (!specialist)
    return <div className="p-4 text-center">Specialist not found</div>;

  return (
    <motion.div
      className="space-y-6 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[#C4C4C4]">
        <Link
          href="/admin/dashboard/specialists"
          className="hover:text-[#F3CFC6]"
        >
          Specialists
        </Link>
        <span>/</span>
        <span>{specialist.name}</span>
      </div>

      {/* Profile Summary */}
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] text-black dark:text-white shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-white">
              <AvatarImage
                src="/assets/images/avatar-placeholder.png"
                alt={specialist.name}
              />
              <AvatarFallback className="bg-[#C4C4C4] text-black">
                {specialist.name[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-2xl font-bold flex items-center">
                <Stethoscope className="mr-2 h-6 w-6" />
                {specialist.name}
              </CardTitle>
              <p className="text-sm opacity-80">Specialist Profile</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="space-y-2">
            <p>Specialty: {specialist.specialty}</p>
            <p>
              Status:{" "}
              <span
                className={
                  specialist.status === "approved"
                    ? "text-green-500"
                    : specialist.status === "rejected"
                      ? "text-red-500"
                      : "text-yellow-500"
                }
              >
                {specialist.status}
              </span>
            </p>
          </div>
          <div className="flex gap-2">
            <Select
              value={specialist.status}
              onValueChange={handleStatusChange}
            >
              <SelectTrigger
                className="w-[140px] border-[#F3CFC6] text-[#F3CFC6] hover:bg-[#F3CFC6]/20"
                aria-label="Update specialist status"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
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
                <p>Name: {specialist.name}</p>
                <p>Specialty: {specialist.specialty}</p>
                <p>Location: {specialist.location}</p>
                <p>Education: {specialist.education}</p>
                <p>License: {specialist.license}</p>
                <p>
                  Status:{" "}
                  <span
                    className={
                      specialist.status === "approved"
                        ? "text-green-500"
                        : specialist.status === "rejected"
                          ? "text-red-500"
                          : "text-yellow-500"
                    }
                  >
                    {specialist.status}
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
                        key={appt.id}
                        variants={itemVariants}
                        className="p-4 hover:bg-[#F3CFC6]/10 dark:hover:bg-[#C4C4C4]/10 transition-colors"
                      >
                        <p className="flex items-center text-black dark:text-white">
                          <Calendar className="mr-2 h-4 w-4 text-[#F3CFC6]" />
                          {appt.user.name} - {appt.date} {appt.time} (
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
                        key={session.id}
                        variants={itemVariants}
                        className="p-4 hover:bg-[#F3CFC6]/10 dark:hover:bg-[#C4C4C4]/10 transition-colors"
                      >
                        <p className="flex items-center text-black dark:text-white">
                          <Video className="mr-2 h-4 w-4 text-[#F3CFC6]" />
                          {session.user} - {session.date} {session.time} (
                          {session.status})
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
        <Link href="/admin/dashboard/specialists">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Specialists
        </Link>
      </Button>
    </motion.div>
  );
}
