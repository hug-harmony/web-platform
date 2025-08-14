/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Calendar, MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AppointmentCard from "@/components/AppointmentCard";

interface Appointment {
  _id: string;
  name: string;
  specialistName: string;
  date: string;
  time: string;
  location: string;
  status: "upcoming" | "completed" | "cancelled";
  rating?: number | null;
  reviewCount?: number | null;
  rate?: number | null;
  specialistId: string;
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

export default function AppointmentsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clientAppointments, setClientAppointments] = useState<Appointment[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [isSpecialist, setIsSpecialist] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (status === "unauthenticated") {
        router.push("/login");
        return;
      }

      try {
        // Fetch specialist status
        const specialistRes = await fetch("/api/specialists/application/me", {
          cache: "no-store",
          credentials: "include",
        });
        if (specialistRes.ok) {
          const { status: appStatus } = await specialistRes.json();
          setIsSpecialist(appStatus === "approved");
        }

        // Fetch user appointments
        const userRes = await fetch("/api/appointment", {
          cache: "no-store",
          credentials: "include",
        });
        if (!userRes.ok) {
          if (userRes.status === 401) {
            router.push("/login");
            return;
          }
          throw new Error(`Failed to fetch appointments: ${userRes.status}`);
        }
        const userData = await userRes.json();
        setAppointments(
          Array.isArray(userData)
            ? userData.map((appt: any) => ({
                _id: appt._id || "",
                name: appt.name || "Unknown",
                specialistId: appt.specialistId || "",
                specialistName: appt.specialistName || "Unknown Specialist",
                date: appt.date || "",
                time: appt.time || "",
                location: appt.location || "",
                status: appt.status || "upcoming",
                rating: appt.rating ?? 0,
                reviewCount: appt.reviewCount ?? 0,
                rate: appt.rate ?? 0,
              }))
            : []
        );

        // Fetch client appointments if specialist
        if (isSpecialist) {
          const clientRes = await fetch("/api/appointment/clients", {
            cache: "no-store",
            credentials: "include",
          });
          if (!clientRes.ok) {
            throw new Error(
              `Failed to fetch client appointments: ${clientRes.status}`
            );
          }
          const clientData = await clientRes.json();
          setClientAppointments(
            Array.isArray(clientData)
              ? clientData.map((appt: any) => ({
                  _id: appt._id || "",
                  name: appt.clientName || "Unknown Client",
                  specialistId: appt.specialistId || "",
                  specialistName: appt.specialistName || "Unknown Specialist",
                  date: appt.date || "",
                  time: appt.time || "",
                  location: appt.location || "",
                  status: appt.status || "upcoming",
                  rating: appt.rating ?? 0,
                  reviewCount: appt.reviewCount ?? 0,
                  rate: appt.rate ?? 0,
                }))
              : []
          );
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Failed to load appointments. Please try again later.");
        toast.error("Failed to load appointments");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [router, status, isSpecialist]);

  const handleDateRangeChange = (key: "start" | "end", value: string) => {
    setDateRange((prev) => ({ ...prev, [key]: value }));
  };

  const filterByDateRange = (data: Appointment[]) =>
    data.filter((item) => {
      if (!item.date) return true;
      const apptDate = new Date(item.date);
      const start = dateRange.start ? new Date(dateRange.start) : null;
      const end = dateRange.end ? new Date(dateRange.end) : null;
      return (!start || apptDate >= start) && (!end || apptDate <= end);
    });

  const handleMessageClick = async (specialistId: string) => {
    if (!specialistId || !/^[0-9a-fA-F]{24}$/.test(specialistId)) {
      toast.error("Invalid specialist ID");
      return;
    }
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientId: specialistId,
          isSpecialistRecipient: true,
        }),
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`Failed to create conversation: ${res.status}`);
      }
      const conversation = await res.json();
      if (conversation.id) {
        router.push(`/dashboard/messaging/${conversation.id}`);
      } else {
        throw new Error("No conversation ID returned");
      }
    } catch (error) {
      console.error("Error creating conversation:", error);
      toast.error("Failed to start conversation");
    }
  };

  const filteredAppointments = filterByDateRange(appointments);
  const filteredClientAppointments = filterByDateRange(clientAppointments);

  if (status === "loading" || loading) {
    return (
      <motion.div
        className="p-4 space-y-6 max-w-7xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
          <CardHeader>
            <motion.div variants={itemVariants}>
              <CardTitle className="text-2xl text-black dark:text-white">
                Appointments
              </CardTitle>
              <p className="text-sm text-black">Manage your appointments</p>
            </motion.div>
          </CardHeader>
          <CardContent className="flex space-x-4">
            <Skeleton className="h-10 w-40 rounded-full bg-[#C4C4C4]/50" />
            <Skeleton className="h-10 w-full bg-[#C4C4C4]/50" />
            <Skeleton className="h-10 w-full bg-[#C4C4C4]/50" />
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader>
            <Skeleton className="h-8 w-48 bg-[#C4C4C4]/50" />
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-48 w-full bg-[#C4C4C4]/50 rounded-lg"
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  return (
    <motion.div
      className="p-4 space-y-6 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
        <CardHeader>
          <motion.div variants={itemVariants}>
            <CardTitle className="text-2xl text-black dark:text-white">
              Appointments
            </CardTitle>
            <p className="text-sm text-[#C4C4C4]">Manage your appointments</p>
          </motion.div>
        </CardHeader>
        <CardContent className="flex space-x-4">
          <motion.div
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
              className="text-[#F3CFC6] border-[#F3CFC6] hover:bg-white dark:hover:bg-white rounded-full"
            >
              <Link href="/dashboard">
                <MessageSquare className="mr-2 h-4 w-4 text-[#F3CFC6]" />
                Back to Dashboard
              </Link>
            </Button>
          </motion.div>
          <div className="relative flex-grow">
            <Calendar className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#fff]" />
            <Input
              type="date"
              placeholder="Start Date"
              value={dateRange.start}
              onChange={(e) => handleDateRangeChange("start", e.target.value)}
              className="p-2 pl-10 rounded border-[#F3CFC6] text-black dark:text-white focus:ring-[#F3CFC6]"
            />
          </div>
          <div className="relative flex-grow">
            <Calendar className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#fff]" />
            <Input
              type="date"
              placeholder="End Date"
              value={dateRange.end}
              onChange={(e) => handleDateRangeChange("end", e.target.value)}
              className="p-2 pl-10 rounded border-[#F3CFC6] text-black dark:text-white focus:ring-[#F3CFC6]"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardContent className="pt-6">
          {error ? (
            <p className="text-center text-red-500">{error}</p>
          ) : isSpecialist ? (
            <Tabs defaultValue="my-appointments" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="my-appointments">
                  My Appointments
                </TabsTrigger>
                <TabsTrigger value="client-appointments">
                  Client Appointments
                </TabsTrigger>
              </TabsList>
              <TabsContent value="my-appointments">
                {filteredAppointments.length > 0 ? (
                  <motion.div
                    className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                    variants={containerVariants}
                  >
                    <AnimatePresence>
                      {filteredAppointments.map((appointment) => (
                        <motion.div
                          key={appointment._id}
                          variants={itemVariants}
                        >
                          <AppointmentCard
                            specialistName={appointment.specialistName}
                            date={appointment.date}
                            time={appointment.time}
                            location={appointment.location}
                            rating={appointment.rating || 0}
                            reviewCount={appointment.reviewCount || 0}
                            rate={appointment.rate || 0}
                            status={appointment.status}
                            onMessage={() =>
                              handleMessageClick(appointment.specialistId)
                            }
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </motion.div>
                ) : (
                  <p className="text-center text-[#C4C4C4]">
                    No appointments found.
                  </p>
                )}
              </TabsContent>
              <TabsContent value="client-appointments">
                {filteredClientAppointments.length > 0 ? (
                  <motion.div
                    className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                    variants={containerVariants}
                  >
                    <AnimatePresence>
                      {filteredClientAppointments.map((appointment) => (
                        <motion.div
                          key={appointment._id}
                          variants={itemVariants}
                        >
                          <AppointmentCard
                            specialistName={appointment.name} // Display client name for client appointments
                            date={appointment.date}
                            time={appointment.time}
                            location={appointment.location}
                            rating={appointment.rating || 0}
                            reviewCount={appointment.reviewCount || 0}
                            rate={appointment.rate || 0}
                            status={appointment.status}
                            onMessage={() =>
                              handleMessageClick(appointment.specialistId)
                            }
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </motion.div>
                ) : (
                  <p className="text-center text-[#C4C4C4]">
                    No client appointments found.
                  </p>
                )}
              </TabsContent>
            </Tabs>
          ) : filteredAppointments.length > 0 ? (
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
              variants={containerVariants}
            >
              <AnimatePresence>
                {filteredAppointments.map((appointment) => (
                  <motion.div key={appointment._id} variants={itemVariants}>
                    <AppointmentCard
                      specialistName={appointment.specialistName}
                      date={appointment.date}
                      time={appointment.time}
                      location={appointment.location}
                      rating={appointment.rating || 0}
                      reviewCount={appointment.reviewCount || 0}
                      rate={appointment.rate || 0}
                      status={appointment.status}
                      onMessage={() =>
                        handleMessageClick(appointment.specialistId)
                      }
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          ) : (
            <p className="text-center text-[#C4C4C4]">No appointments found.</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
