"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import SpecialistCard from "@/components/Specialist_Cards";

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

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const AppointmentsPage: React.FC = () => {
  const router = useRouter();
  const [showAll, setShowAll] = useState(false);

  const appointments: Appointment[] = [
    {
      _id: "1",
      name: "John Doe",
      specialistName: "Dr. Jane Smith",
      date: "2025-10-15",
      time: "10:00 AM",
      location: "New York, NY",
      status: "upcoming",
      rating: 4.8,
      reviewCount: 120,
      rate: 50,
    },
    {
      _id: "2",
      name: "John Doe",
      specialistName: "Dr. Alex Brown",
      date: "2025-10-20",
      time: "2:00 PM",
      location: "Los Angeles, CA",
      status: "upcoming",
      rating: 4.7,
      reviewCount: 95,
      rate: 60,
    },
    {
      _id: "3",
      name: "John Doe",
      specialistName: "Dr. Sam Carter",
      date: "2025-08-10",
      time: "3:00 PM",
      location: "Chicago, IL",
      status: "completed",
      rating: 4.6,
      reviewCount: 110,
      rate: 55,
    },
    {
      _id: "4",
      name: "John Doe",
      specialistName: "Dr. Robin White",
      date: "2025-07-05",
      time: "11:00 AM",
      location: "Seattle, WA",
      status: "cancelled",
      rating: 4.8,
      reviewCount: 130,
      rate: 65,
    },
  ];

  const upcomingAppointments = appointments.filter(
    (appointment) => appointment.status === "upcoming"
  );
  const otherAppointments = appointments.filter(
    (appointment) => appointment.status !== "upcoming"
  );

  const handleViewDetails = (id: string) => {
    router.push(`/dashboard/appointments/${id}`);
  };

  return (
    <motion.div
      className="flex min-h-screen items-start p-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Card className="w-full max-w-6xl rounded-3xl border border-gray-200">
        <CardHeader>
          <CardTitle className="text-center text-4xl font-extrabold text-[#333]">
            My Appointments
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-8">
          <section className="mb-6">
            <h2 className="text-lg font-semibold text-center mb-4">Upcoming</h2>
            <motion.div
              className="flex flex-wrap gap-4"
              variants={containerVariants}
            >
              <AnimatePresence>
                {upcomingAppointments.map((appointment) => (
                  <motion.div key={appointment._id} variants={cardVariants}>
                    <SpecialistCard
                      name={appointment.specialistName}
                      imageSrc={`/images/${appointment.specialistName.toLowerCase().replace("dr. ", "")}.jpg`}
                      location={appointment.location}
                      rating={appointment.rating || 0}
                      reviewCount={appointment.reviewCount || 0}
                      rate={appointment.rate || 0}
                      onMessage={() => handleViewDetails(appointment._id)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          </section>

          {showAll && (
            <section className="mb-6">
              <h2 className="text-lg font-semibold text-center mb-4">
                Previous, Cancelled & Completed
              </h2>
              <motion.div
                className="flex flex-wrap gap-4"
                variants={containerVariants}
              >
                <AnimatePresence>
                  {otherAppointments.map((appointment) => (
                    <motion.div key={appointment._id} variants={cardVariants}>
                      <SpecialistCard
                        name={appointment.specialistName}
                        imageSrc={`/images/${appointment.specialistName.toLowerCase().replace("dr. ", "")}.jpg`}
                        location={appointment.location}
                        rating={appointment.rating || 0}
                        reviewCount={appointment.reviewCount || 0}
                        rate={appointment.rate || 0}
                        onMessage={() => handleViewDetails(appointment._id)}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            </section>
          )}

          <div className="flex justify-center">
            <Button
              onClick={() => setShowAll(!showAll)}
              className="py-5 px-8 text-2xl rounded-xl font-bold bg-[#E8C5BC] text-black hover:bg-[#ddb0a3]"
            >
              {showAll ? "Hide" : "View All"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default AppointmentsPage;
