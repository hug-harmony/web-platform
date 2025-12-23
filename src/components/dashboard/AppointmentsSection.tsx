// src/components/dashboard/AppointmentsSection.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, MapPin } from "lucide-react";
import type { Appointment } from "@/types/dashboard";

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

function formatAppointmentDateTime(startTime: string): {
  date: string;
  time: string;
} {
  const dateObj = new Date(startTime);
  return {
    date: dateObj.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    time: dateObj.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

interface AppointmentsSectionProps {
  appointments: Appointment[];
}

export function AppointmentsSection({
  appointments,
}: AppointmentsSectionProps) {
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");

  const upcomingAppointments = appointments.filter(
    (appt) => appt.status === "upcoming"
  );

  const pastAppointments = appointments.filter(
    (appt) =>
      appt.status === "completed" ||
      appt.status === "cancelled" ||
      appt.status === "disputed"
  );

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-black dark:text-white">
          <Clock className="mr-2 h-6 w-6 text-[#F3CFC6]" />
          Your Appointments
          {upcomingAppointments.length > 0 && (
            <Badge className="ml-2 bg-[#F3CFC6] text-black">
              {upcomingAppointments.length} upcoming
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as "upcoming" | "past")}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 bg-[#F3CFC6]/20 dark:bg-[#C4C4C4]/20">
            <TabsTrigger value="upcoming">
              Upcoming ({upcomingAppointments.length})
            </TabsTrigger>
            <TabsTrigger value="past">
              Past ({pastAppointments.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming">
            <ScrollArea className="h-[200px]">
              <motion.div className="space-y-2" variants={containerVariants}>
                <AnimatePresence>
                  {upcomingAppointments.length > 0 ? (
                    upcomingAppointments.slice(0, 5).map((appt) => {
                      const { date, time } = formatAppointmentDateTime(
                        appt.startTime
                      );
                      return (
                        <motion.div
                          key={appt._id}
                          variants={itemVariants}
                          initial="hidden"
                          animate="visible"
                          exit={{ opacity: 0, x: -20 }}
                          className="flex items-center justify-between p-3 hover:bg-[#F3CFC6]/10 dark:hover:bg-[#C4C4C4]/10 rounded-md"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-black dark:text-white truncate">
                              {appt.professionalName}
                            </p>
                            <div className="flex items-center gap-2 text-sm text-[#C4C4C4]">
                              <span>{date}</span>
                              <span>•</span>
                              <span>{time}</span>
                            </div>
                            {appt.venue && (
                              <div className="flex items-center gap-1 text-xs text-[#C4C4C4] mt-1">
                                <MapPin className="h-3 w-3" />
                                <span className="truncate">{appt.venue}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge className="bg-green-100 text-green-800">
                              ${appt.rate}/hr
                            </Badge>
                            <Button
                              asChild
                              variant="outline"
                              size="sm"
                              className="text-[#F3CFC6] border-[#F3CFC6]"
                            >
                              <Link href="/dashboard/appointments">
                                Details
                              </Link>
                            </Button>
                          </div>
                        </motion.div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8">
                      <Clock className="h-12 w-12 text-[#C4C4C4] mx-auto mb-2" />
                      <p className="text-[#C4C4C4]">
                        No upcoming appointments.
                      </p>
                      <Button asChild variant="link" className="text-[#F3CFC6]">
                        <Link href="/dashboard/professionals">
                          Book an appointment
                        </Link>
                      </Button>
                    </div>
                  )}
                </AnimatePresence>
              </motion.div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="past">
            <ScrollArea className="h-[200px]">
              <motion.div className="space-y-2" variants={containerVariants}>
                <AnimatePresence>
                  {pastAppointments.length > 0 ? (
                    pastAppointments.slice(0, 5).map((appt) => {
                      const { date, time } = formatAppointmentDateTime(
                        appt.startTime
                      );
                      return (
                        <motion.div
                          key={appt._id}
                          variants={itemVariants}
                          initial="hidden"
                          animate="visible"
                          exit={{ opacity: 0, x: -20 }}
                          className="flex items-center justify-between p-3 hover:bg-[#F3CFC6]/10 dark:hover:bg-[#C4C4C4]/10 rounded-md opacity-75"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-black dark:text-white truncate">
                              {appt.professionalName}
                            </p>
                            <div className="flex items-center gap-2 text-sm text-[#C4C4C4]">
                              <span>{date}</span>
                              <span>•</span>
                              <span>{time}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge
                              variant={
                                appt.status === "completed"
                                  ? "default"
                                  : appt.status === "cancelled"
                                    ? "destructive"
                                    : "secondary"
                              }
                            >
                              {appt.status.charAt(0).toUpperCase() +
                                appt.status.slice(1)}
                            </Badge>
                            <Button
                              asChild
                              variant="outline"
                              size="sm"
                              className="text-[#F3CFC6] border-[#F3CFC6]"
                            >
                              <Link href="/dashboard/appointments">View</Link>
                            </Button>
                          </div>
                        </motion.div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-[#C4C4C4]">No past appointments.</p>
                    </div>
                  )}
                </AnimatePresence>
              </motion.div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {appointments.length > 0 && (
          <Button asChild variant="link" className="mt-4 text-[#F3CFC6]">
            <Link href="/dashboard/appointments">View All Appointments</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
