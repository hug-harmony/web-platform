/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AppointmentCard from "@/components/AppointmentCard";

interface Appointment {
  _id: string;
  name: string; // clientName for client appointments
  specialistName: string; // cuddlerName for user appointments
  date: string;
  time: string;
  status: "upcoming" | "completed" | "cancelled" | "disputed";
  rating?: number | null;
  reviewCount?: number | null;
  rate?: number | null;
  specialistId: string;
  specialistUserId?: string;
  clientId?: string;
  disputeStatus: string;
}

// const containerVariants = {
//   hidden: { opacity: 0, y: 20 },
//   visible: {
//     opacity: 1,
//     y: 0,
//     transition: { duration: 0.5, staggerChildren: 0.2 },
//   },
// };

// const itemVariants = {
//   hidden: { opacity: 0, y: 10 },
//   visible: { opacity: 1, y: 0 },
// };

export default function AppointmentsPage() {
  const router = useRouter();
  const { status } = useSession();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clientAppointments, setClientAppointments] = useState<Appointment[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [isSpecialist, setIsSpecialist] = useState(false);

  const fetchData = async () => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    try {
      // Fetch specialist status FIRST and wait for it
      const specialistRes = await fetch("/api/specialists/application/me", {
        cache: "no-store",
        credentials: "include",
      });

      let specialistStatus = false;
      if (specialistRes.ok) {
        const { status: appStatus } = await specialistRes.json();
        specialistStatus = appStatus === "approved";
        setIsSpecialist(specialistStatus);
      } else {
        console.error(
          "Failed to fetch specialist status:",
          specialistRes.status
        );
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
              name: appt.clientName || "Unknown Client",
              specialistId: appt.specialistId || "",
              specialistName: appt.cuddlerName || "Unknown Specialist",
              date: appt.date || "",
              time: appt.time || "",
              status: appt.status || "upcoming",
              rating: appt.rating ?? 0,
              reviewCount: appt.reviewCount ?? 0,
              rate: appt.rate ?? 0,
              specialistUserId: appt.specialistUserId || "",
              disputeStatus: appt.disputeStatus || "none",
            }))
          : []
      );

      // Fetch client appointments if specialist - use the local variable, not state
      if (specialistStatus) {
        console.log("Fetching client appointments for specialist...");
        const clientRes = await fetch("/api/appointment/clients", {
          cache: "no-store",
          credentials: "include",
        });
        if (!clientRes.ok) {
          console.error(
            `Failed to fetch client appointments: ${clientRes.status}`
          );
          throw new Error(
            `Failed to fetch client appointments: ${clientRes.status}`
          );
        }
        const clientData = await clientRes.json();
        console.log("Client appointments data:", clientData);
        setClientAppointments(
          Array.isArray(clientData)
            ? clientData.map((appt: any) => ({
                _id: appt._id || "",
                name: appt.clientName || "Unknown Client",
                specialistId: appt.specialistId || "",
                specialistName: appt.specialistName || "Unknown Specialist",
                date: appt.date || "",
                time: appt.time || "",
                status: appt.status || "upcoming",
                rating: appt.rating ?? 0,
                reviewCount: appt.reviewCount ?? 0,
                rate: appt.rate ?? 0,
                clientId: appt.clientId || "",
                disputeStatus: appt.disputeStatus || "none",
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

  useEffect(() => {
    fetchData();
  }, [router, status]);

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

  const handleMessageClick = async (userId: string) => {
    if (!userId || !/^[0-9a-fA-F]{24}$/.test(userId)) {
      toast.error("Invalid or missing user ID");
      return;
    }
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId: userId }),
        credentials: "include",
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(
          errorData.error || `Failed to create conversation: ${res.status}`
        );
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
      <motion.div className="p-4 space-y-6 max-w-7xl mx-auto">
        <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Appointments</CardTitle>
          </CardHeader>
          <CardContent className="flex space-x-4">
            <Skeleton className="h-10 w-40 rounded-full bg-[#C4C4C4]/50" />
            <Skeleton className="h-10 w-full bg-[#C4C4C4]/50" />
            <Skeleton className="h-10 w-full bg-[#C4C4C4]/50" />
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
    <motion.div className="p-4 space-y-6 max-w-7xl mx-auto">
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Appointments</CardTitle>
        </CardHeader>
      </Card>

      <Card className="shadow-lg">
        <CardContent className="pt-6">
          {error ? (
            <p className="text-center text-red-500">{error}</p>
          ) : isSpecialist ? (
            <Tabs defaultValue="my-appointments" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="my-appointments">
                  My Appointments ({filteredAppointments.length})
                </TabsTrigger>
                <TabsTrigger value="client-appointments">
                  Client Appointments ({filteredClientAppointments.length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="my-appointments">
                {filteredAppointments.length > 0 ? (
                  <motion.div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <AnimatePresence>
                      {filteredAppointments.map((appointment) => (
                        <AppointmentCard
                          key={appointment._id}
                          appointmentId={appointment._id}
                          specialistName={appointment.specialistName}
                          date={appointment.date}
                          time={appointment.time}
                          rating={appointment.rating || 0}
                          reviewCount={appointment.reviewCount || 0}
                          rate={appointment.rate || 0}
                          status={appointment.status}
                          disputeStatus={appointment.disputeStatus}
                          isSpecialist={isSpecialist}
                          isOwnerSpecialist={false}
                          onMessage={() =>
                            handleMessageClick(
                              appointment.specialistUserId || ""
                            )
                          }
                          onDispute={fetchData}
                        />
                      ))}
                    </AnimatePresence>
                  </motion.div>
                ) : (
                  <p>No appointments found.</p>
                )}
              </TabsContent>
              <TabsContent value="client-appointments">
                {filteredClientAppointments.length > 0 ? (
                  <motion.div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <AnimatePresence>
                      {filteredClientAppointments.map((appointment) => (
                        <AppointmentCard
                          key={appointment._id}
                          appointmentId={appointment._id}
                          specialistName={appointment.name}
                          date={appointment.date}
                          time={appointment.time}
                          rating={appointment.rating || 0}
                          reviewCount={appointment.reviewCount || 0}
                          rate={appointment.rate || 0}
                          status={appointment.status}
                          disputeStatus={appointment.disputeStatus}
                          isSpecialist={isSpecialist}
                          isOwnerSpecialist={true}
                          onMessage={() =>
                            handleMessageClick(appointment.clientId || "")
                          }
                          onDispute={fetchData}
                        />
                      ))}
                    </AnimatePresence>
                  </motion.div>
                ) : (
                  <p>No client appointments found.</p>
                )}
              </TabsContent>
            </Tabs>
          ) : (
            <motion.div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <AnimatePresence>
                {filteredAppointments.map((appointment) => (
                  <AppointmentCard
                    key={appointment._id}
                    appointmentId={appointment._id}
                    specialistName={appointment.specialistName}
                    date={appointment.date}
                    time={appointment.time}
                    rating={appointment.rating || 0}
                    reviewCount={appointment.reviewCount || 0}
                    rate={appointment.rate || 0}
                    status={appointment.status}
                    disputeStatus={appointment.disputeStatus}
                    isSpecialist={isSpecialist}
                    isOwnerSpecialist={false}
                    onMessage={() =>
                      handleMessageClick(appointment.specialistUserId || "")
                    }
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
