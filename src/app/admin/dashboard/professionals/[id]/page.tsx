// File: app/admin/dashboard/professionals/[id]/page.tsx
"use client";

import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  Stethoscope,
  Calendar,
  Video,
  ArrowLeft,
  DollarSign,
  Users,
  Clock,
  Ban,
  CheckCircle,
} from "lucide-react";

import Link from "next/link";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

// ====================== Interfaces ======================

interface Professional {
  id: string;
  name: string;
  biography: string;
  rate: number;
  image?: string;
  status: "APPROVED" | "SUSPENDED";
  venue?: string;
  location?: string;
  rating?: number;
  reviewCount?: number;
  applicationId?: string;
  lastOnline?: string;
  metrics?: {
    totalEarnings: number;
    companyCutPercentage: number;
    completedSessions: number;
    hourlyRate: number;
  };
}

interface Appointment {
  id: string;
  user: { name: string } | null;
  startTime: string;
  endTime: string;
  status: "upcoming" | "completed" | "cancelled" | "disputed" | "break";
  rate?: number;
}

interface VideoSession {
  id: string;
  user: string;
  date: string;
  time: string;
  status: "upcoming" | "completed" | "cancelled";
}

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

// Animations
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

// ====================== Component ======================

export default function ProfessionalDetailPage() {
  const { id } = useParams();
  const [professional, setProfessional] = useState<Professional | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [videoSessions] = useState<VideoSession[]>(dummyVideoSessions);
  const [loading, setLoading] = useState(true);
  const [suspendLoading, setSuspendLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const isSuspended = professional?.status === "SUSPENDED";

  useEffect(() => {
    async function fetchData() {
      if (!id || typeof id !== "string") return;
      setLoading(true);

      try {
        const [profRes, apptRes] = await Promise.all([
          fetch(`/api/professionals?id=${id}`, { credentials: "include" }),
          fetch(`/api/appointment?professionalId=${id}&admin=true`, {
            credentials: "include",
          }),
        ]);

        if (!profRes.ok) throw new Error("Failed to fetch professional");
        const profData = await profRes.json();
        setProfessional(profData);

        if (apptRes.ok) {
          const apptData = await apptRes.json();
          setAppointments(Array.isArray(apptData) ? apptData : []);
        }
      } catch (error) {
        toast.error((error as Error).message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id]);

  // ====================== Suspend / Re-enable Handler ======================

  const handleToggleSuspend = async () => {
    if (!professional?.applicationId) {
      toast.error("Missing application ID");
      return;
    }

    setSuspendLoading(true);
    try {
      const res = await fetch("/api/professionals/application", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          id: professional.applicationId,
          status: isSuspended ? "APPROVED" : "SUSPENDED",
        }),
      });

      if (!res.ok) throw new Error("Failed to update status");

      toast.success(
        isSuspended ? "Professional re-enabled" : "Professional suspended"
      );

      // Update state
      setProfessional((prev) =>
        prev
          ? { ...prev, status: isSuspended ? "APPROVED" : "SUSPENDED" }
          : null
      );
    } catch {
      toast.error("Failed to update status");
    } finally {
      setSuspendLoading(false);
    }
  };

  // ====================== Loading / Error ======================

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!professional)
    return (
      <div className="p-8 text-center text-red-500">Professional not found</div>
    );

  // Metrics
  const metrics = professional.metrics || {
    totalEarnings: 0,
    companyCutPercentage: 20,
    completedSessions: 0,
    hourlyRate: professional.rate,
  };
  const netEarnings =
    metrics.totalEarnings * (1 - metrics.companyCutPercentage / 100);
  const completedAppointments = appointments.filter(
    (a) => a.status === "completed"
  ).length;

  // ====================== UI ======================

  return (
    <motion.div
      className="space-y-6 max-w-7xl mx-auto p-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link
          href="/admin/dashboard/professionals"
          className="hover:text-[#F3CFC6]"
        >
          Professionals
        </Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-white">
          {professional.name}
        </span>
      </div>

      {/* Header Card */}
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] text-black shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            {/* Left side */}
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border-2 border-white">
                <AvatarImage
                  src={
                    professional.image ||
                    "/assets/images/avatar-placeholder.png"
                  }
                  alt={professional.name}
                />
                <AvatarFallback className="bg-[#C4C4C4] text-black text-xl">
                  {professional.name[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div>
                <CardTitle className="text-2xl font-bold flex items-center gap-2">
                  <Stethoscope className="h-6 w-6" />
                  {professional.name}
                </CardTitle>
                <p className="text-sm opacity-80">Professional Profile</p>
              </div>
            </div>

            {/* Right side — Status + Suspend Toggle */}
            <div className="flex items-center gap-3">
              <Badge variant={isSuspended ? "destructive" : "default"}>
                {isSuspended ? "Suspended" : "Active"}
              </Badge>

              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant={isSuspended ? "default" : "destructive"}
                    size="sm"
                    disabled={suspendLoading}
                    className="gap-2"
                  >
                    {isSuspended ? (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        Re-enable
                      </>
                    ) : (
                      <>
                        <Ban className="h-4 w-4" />
                        Suspend
                      </>
                    )}
                  </Button>
                </DialogTrigger>

                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {isSuspended ? "Re-enable" : "Suspend"}{" "}
                      {professional.name}?
                    </DialogTitle>
                    <DialogDescription>
                      {isSuspended
                        ? "This professional will be able to accept new bookings again."
                        : "This will prevent them from receiving new bookings. Existing bookings remain unaffected."}
                    </DialogDescription>
                  </DialogHeader>

                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={async () => {
                        await handleToggleSuspend();
                        setIsDialogOpen(false);
                      }}
                      disabled={suspendLoading}
                    >
                      {suspendLoading
                        ? "Saving..."
                        : isSuspended
                          ? "Re-enable"
                          : "Suspend"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex flex-wrap gap-4 text-sm">
            <p>
              Status:{" "}
              <span
                className={`font-semibold ${isSuspended ? "text-red-600" : "text-green-800"}`}
              >
                {isSuspended ? "Suspended" : "Active"}
              </span>
            </p>
            {professional.location && (
              <p>
                Location:{" "}
                <span className="font-semibold">{professional.location}</span>
              </p>
            )}
            <p>
              Rate:{" "}
              <span className="font-semibold">${professional.rate}/hr</span>
            </p>
            {/* <p>
              Last Online:{" "}
              <span className="font-semibold">
                ${professional.lastOnline}/hr
              </span>
            </p> */}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Card>
        <CardContent className="p-0">
          <Tabs defaultValue="details" className="p-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="appointments">Appointments</TabsTrigger>
              <TabsTrigger value="videos">Video Sessions</TabsTrigger>
              <TabsTrigger value="metrics">Metrics</TabsTrigger>
            </TabsList>

            {/* Details */}
            <TabsContent value="details" className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="font-medium text-black dark:text-white">
                    {professional.name}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Hourly Rate</p>
                  <p className="font-medium text-black dark:text-white">
                    ${professional.rate}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Venue Preference</p>
                  <p className="font-medium capitalize">
                    {professional.venue || "Not specified"}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Rating</p>
                  <p className="font-medium">
                    {professional.rating?.toFixed(1) || "No ratings"} (
                    {professional.reviewCount || 0} reviews)
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500">Biography</p>
                <p className="font-medium mt-1">
                  {professional.biography || "Not provided."}
                </p>
              </div>
            </TabsContent>

            {/* Appointments */}
            <TabsContent value="appointments">
              <ScrollArea className="h-[400px]">
                <AnimatePresence mode="popLayout">
                  {appointments.length > 0 ? (
                    <div className="space-y-2">
                      {appointments.map((appt) => (
                        <motion.div
                          key={appt.id}
                          variants={itemVariants}
                          initial="hidden"
                          animate="visible"
                          exit={{ opacity: 0, x: -20 }}
                          className="p-4 border-b hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors rounded"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Calendar className="h-4 w-4 text-[#F3CFC6]" />
                              <div>
                                <p className="font-medium">
                                  {appt.user?.name || "Unknown User"}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {format(
                                    parseISO(appt.startTime),
                                    "MMM d, yyyy 'at' h:mm a"
                                  )}
                                </p>
                              </div>
                            </div>

                            <span
                              className={`capitalize text-xs font-semibold px-2 py-1 rounded-full ${
                                appt.status === "completed"
                                  ? "bg-green-100 text-green-800"
                                  : appt.status === "cancelled"
                                    ? "bg-red-100 text-red-800"
                                    : appt.status === "upcoming"
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {appt.status}
                            </span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-gray-500">
                      No appointments found.
                    </div>
                  )}
                </AnimatePresence>
              </ScrollArea>
            </TabsContent>

            {/* Video Sessions */}
            <TabsContent value="videos">
              <ScrollArea className="h-[400px]">
                <AnimatePresence mode="popLayout">
                  {videoSessions.length > 0 ? (
                    <div className="space-y-2">
                      {videoSessions.map((session) => (
                        <motion.div
                          key={session.id}
                          variants={itemVariants}
                          initial="hidden"
                          animate="visible"
                          exit={{ opacity: 0, x: -20 }}
                          className="p-4 border-b hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors rounded"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Video className="h-4 w-4 text-[#F3CFC6]" />
                              <div>
                                <p className="font-medium">{session.user}</p>
                                <p className="text-sm text-gray-500">
                                  {session.date} at {session.time}
                                </p>
                              </div>
                            </div>

                            <span
                              className={`capitalize text-xs font-semibold px-2 py-1 rounded-full ${
                                session.status === "completed"
                                  ? "bg-green-100 text-green-800"
                                  : session.status === "upcoming"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {session.status}
                            </span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-gray-500">
                      No video sessions found.
                    </div>
                  )}
                </AnimatePresence>
              </ScrollArea>
            </TabsContent>

            {/* Metrics */}
            <TabsContent value="metrics" className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Earnings */}
                <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-500 rounded-lg">
                        <DollarSign className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total Earnings</p>
                        <p className="text-2xl font-bold text-green-700">
                          ${metrics.totalEarnings.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Completed Sessions */}
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500 rounded-lg">
                        <Users className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">
                          Completed Sessions
                        </p>
                        <p className="text-2xl font-bold text-blue-700">
                          {completedAppointments}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Hourly Rate */}
                <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-500 rounded-lg">
                        <Clock className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Hourly Rate</p>
                        <p className="text-2xl font-bold text-purple-700">
                          ${metrics.hourlyRate}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Net Earnings */}
                <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-500 rounded-lg">
                        <DollarSign className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Net Earnings</p>
                        <p className="text-2xl font-bold text-orange-700">
                          ${netEarnings.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500">
                          After {metrics.companyCutPercentage}% cut
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Back Button */}
      <Button asChild variant="link" className="text-[#F3CFC6]">
        <Link href="/admin/dashboard/professionals">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Professionals
        </Link>
      </Button>
    </motion.div>
  );
}
