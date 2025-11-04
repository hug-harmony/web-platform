// File: app/admin/dashboard/specialists/[id]/page.tsx
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
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

// --- Interfaces for the component's state ---

// A more complete type for the Specialist data
interface Specialist {
  id: string;
  name: string;
  biography: string;
  rate: number;
  image?: string;
  status: "APPROVED";
  metrics: {
    totalEarnings: number;
    companyCutPercentage: number;
    completedSessions: number;
    hourlyRate: number;
  };
}

// UPDATED: Appointment interface to match the new API response schema
interface Appointment {
  _id: string;
  user: { name: string };
  startTime: string; // Full ISO String (e.g., "2024-10-27T10:00:00.000Z")
  endTime: string; // Full ISO String
  status: "upcoming" | "completed" | "cancelled" | "disputed";
}

interface VideoSession {
  id: string;
  user: string;
  date: string;
  time: string;
  status: "upcoming" | "completed" | "cancelled";
}

// Dummy data as provided in original file
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

export default function SpecialistDetailPage() {
  const { id } = useParams();
  const [specialist, setSpecialist] = useState<Specialist | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [videoSessions, setVideoSessions] = useState<VideoSession[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all necessary data for the specialist's detail page
  useEffect(() => {
    async function fetchData() {
      if (!id || typeof id !== "string") return;
      setLoading(true);
      try {
        // Fetch specialist details and appointments in parallel for performance
        const [specialistResponse, apptResponse] = await Promise.all([
          fetch(`/api/specialists?id=${id}`),
          // UPDATED: This now correctly calls the updated /api/appointment route
          // The `admin=true` flag is crucial for authorization
          fetch(`/api/appointment?specialistId=${id}&admin=true`),
        ]);

        if (!specialistResponse.ok)
          throw new Error("Failed to fetch specialist details");
        const specialistData = await specialistResponse.json();
        setSpecialist(specialistData);

        if (!apptResponse.ok) throw new Error("Failed to fetch appointments");
        const apptData = await apptResponse.json();
        setAppointments(apptData);

        // Use dummy video sessions as before
        setVideoSessions(dummyVideoSessions);
      } catch (error) {
        toast.error(
          (error as Error).message || "Failed to load specialist data"
        );
        console.error("Data fetch error:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  if (loading)
    return <div className="p-4 text-center">Loading specialist profile...</div>;
  if (!specialist)
    return <div className="p-4 text-center">Professional not found.</div>;

  // Safer calculation for metrics
  const cutAmount =
    (specialist.metrics?.totalEarnings || 0) *
    ((specialist.metrics?.companyCutPercentage || 0) / 100);
  const netEarnings = (specialist.metrics?.totalEarnings || 0) - cutAmount;

  return (
    <motion.div
      className="space-y-6 max-w-7xl mx-auto p-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Link
          href="/admin/dashboard/specialists"
          className="hover:text-[#F3CFC6]"
        >
          Professionals
        </Link>
        <span>/</span>
        <span>{specialist.name}</span>
      </div>

      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] text-black shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-white">
              <AvatarImage
                src={
                  specialist.image || "/assets/images/avatar-placeholder.png"
                }
                alt={specialist.name}
              />
              <AvatarFallback className="bg-[#C4C4C4] text-black">
                {specialist.name?.[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-2xl font-bold flex items-center">
                <Stethoscope className="mr-2 h-6 w-6" />
                {specialist.name}
              </CardTitle>
              <p className="text-sm opacity-80">Professional Profile</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p>
            Status:{" "}
            <span className="font-semibold text-green-800">
              {specialist.status}
            </span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Tabs defaultValue="details" className="p-4">
            <TabsList>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="appointments">Appointments</TabsTrigger>
              <TabsTrigger value="videos">Video Sessions</TabsTrigger>
              <TabsTrigger value="metrics">Metrics</TabsTrigger>
            </TabsList>

            <TabsContent
              value="details"
              className="p-4 space-y-2 text-black dark:text-white"
            >
              <p>
                <strong>Name:</strong> {specialist.name}
              </p>
              <p>
                <strong>Hourly Rate:</strong> ${specialist.rate}
              </p>
              <p>
                <strong>Biography:</strong>{" "}
                {specialist.biography || "Not provided."}
              </p>
            </TabsContent>

            <TabsContent value="appointments">
              <ScrollArea className="h-[300px]">
                <AnimatePresence>
                  {appointments.length > 0 ? (
                    appointments.map((appt) => (
                      <motion.div
                        key={appt._id}
                        variants={itemVariants}
                        className="p-4 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        <p className="flex items-center text-sm">
                          <Calendar className="mr-3 h-4 w-4 text-[#F3CFC6]" />
                          <span className="font-medium text-black dark:text-white">
                            {appt.user.name}
                          </span>
                          <span className="mx-2 text-gray-400">-</span>
                          {/* UPDATED: Display logic using date-fns for a clean and accurate format */}
                          <span className="text-gray-600 dark:text-gray-400">
                            {format(
                              parseISO(appt.startTime),
                              "MMM d, yyyy 'at' h:mm a"
                            )}
                          </span>
                          <span className="ml-auto capitalize text-xs font-semibold p-1 px-2 rounded-full bg-gray-200 dark:bg-gray-700 text-black dark:text-white">
                            {appt.status}
                          </span>
                        </p>
                      </motion.div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-gray-500">
                      No appointments found for this professional.
                    </div>
                  )}
                </AnimatePresence>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="videos">
              {/* ... Video sessions logic ... */}
            </TabsContent>
            <TabsContent value="metrics">
              {/* ... Metrics logic ... */}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Button asChild variant="link" className="text-[#F3CFC6]">
        <Link href="/admin/dashboard/specialists">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Professionals
        </Link>
      </Button>
    </motion.div>
  );
}
