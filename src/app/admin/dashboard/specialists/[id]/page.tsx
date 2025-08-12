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
import { useState } from "react";

interface Specialist {
  id: string;
  name: string;
  specialty: string;
  status: "active" | "pending";
}

interface Appointment {
  id: string;
  user: string;
  date: string;
}

interface VideoSession {
  id: string;
  user: string;
  date: string;
}

const specialist: Specialist = {
  id: "spec_1",
  name: "Dr. Sarah Johnson",
  specialty: "Therapist",
  status: "active",
};

const appointments: Appointment[] = [
  { id: "appt_1", user: "John Doe", date: "2025-08-15" },
];

const videoSessions: VideoSession[] = [
  { id: "vid_1", user: "John Doe", date: "2025-08-10" },
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
  const [status, setStatus] = useState(specialist.status);

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
                  status === "active" ? "text-green-500" : "text-yellow-500"
                }
              >
                {status}
              </span>
            </p>
          </div>
          <div className="flex gap-2">
            <Select
              value={status}
              onValueChange={(value) =>
                setStatus(value as "active" | "pending")
              }
            >
              <SelectTrigger
                className="w-[140px] border-[#F3CFC6] text-[#F3CFC6] hover:bg-[#F3CFC6]/20"
                aria-label="Update specialist status"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Activate</SelectItem>
                <SelectItem value="pending">Set to Pending</SelectItem>
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
                <p>Specialty: {specialist.specialty}</p>
                <p>
                  Status:{" "}
                  <span
                    className={
                      status === "active" ? "text-green-500" : "text-yellow-500"
                    }
                  >
                    {status}
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
                        {appt.user} - {appt.date}
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
                        {vid.user} - {vid.date}
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
        <Link href="/admin/dashboard/specialists">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Specialists
        </Link>
      </Button>
    </motion.div>
  );
}
