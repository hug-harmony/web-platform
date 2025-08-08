/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Calendar } from "lucide-react";
import { useRouter } from "next/navigation";
import AppointmentCard from "@/components/AppointmentCard";

interface Appointment {
  _id: string;
  name: string;
  specialistName: string;
  date: string;
  time: string;
  location: string;
  status: "upcoming" | "completed" | "cancelled";
  rating?: number;
  reviewCount?: number;
  rate?: number;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.2 } },
};

export default function AppointmentsPage() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const res = await fetch("/api/appointment", {
          cache: "no-store",
          credentials: "include",
        });
        if (!res.ok) {
          console.error(
            "Appointments API error:",
            res.status,
            await res.text()
          );
          if (res.status === 401) {
            router.push("/login");
            return;
          }
          throw new Error(`Failed to fetch appointments: ${res.status}`);
        }
        const data = await res.json();
        setAppointments(
          Array.isArray(data)
            ? data.map((appt: any) => ({
                _id: appt._id,
                name: appt.name || "Unknown",
                specialistName: appt.specialistName || "Unknown Specialist",
                date: appt.date || "",
                time: appt.time || "",
                location: appt.location || "",
                status: appt.status || "upcoming",
                rating: appt.rating || 0,
                reviewCount: appt.reviewCount || 0,
                rate: appt.rate || 0,
              }))
            : []
        );
      } catch (error) {
        console.error("Error fetching appointments:", error);
        setError("Failed to load appointments. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    fetchAppointments();
  }, [router]);

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

  const filteredAppointments = filterByDateRange(appointments);

  return (
    <motion.div
      className="p-4 space-y-6 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="w-full max-w-6xl">
        <div className="flex items-center mb-6 w-full space-x-2">
          <div className="relative flex-grow">
            <Calendar className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <Input
              type="date"
              placeholder="Start Date"
              value={dateRange.start}
              onChange={(e) => handleDateRangeChange("start", e.target.value)}
              className="p-2 pl-10 rounded border border-gray-300 w-full"
            />
          </div>
          <div className="relative flex-grow">
            <Calendar className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <Input
              type="date"
              placeholder="End Date"
              value={dateRange.end}
              onChange={(e) => handleDateRangeChange("end", e.target.value)}
              className="p-2 pl-10 rounded border border-gray-300 w-full"
            />
          </div>
        </div>

        <section className="mb-6">
          <h2 className="text-lg font-semibold text-center mb-4">
            My Appointments
          </h2>
          {loading ? (
            <p className="text-center">Loading...</p>
          ) : error ? (
            <p className="text-center text-red-500">{error}</p>
          ) : filteredAppointments.length > 0 ? (
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
              variants={containerVariants}
            >
              <AnimatePresence>
                {filteredAppointments.map((appointment) => (
                  <motion.div key={appointment._id}>
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
                        router.push(`/dashboard/messaging/${appointment._id}`)
                      }
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          ) : (
            <p className="text-center">No appointments found.</p>
          )}
        </section>
      </div>
    </motion.div>
  );
}
