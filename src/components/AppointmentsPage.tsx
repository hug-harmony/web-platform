/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Search, Filter } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import AppointmentCard from "@/components/AppointmentCard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Calendar as BigCalendar,
  momentLocalizer,
  Event,
} from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";

interface Appointment {
  _id: string;
  name: string;
  specialistName: string;
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

const localizer = momentLocalizer(moment);

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
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selected, setSelected] = useState<{
    appointment: Appointment;
    isOwnerSpecialist: boolean;
    displayName: string;
  } | null>(null);

  const fetchData = async () => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    try {
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

      if (specialistStatus) {
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

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
  };

  const filterByDateRangeAndSearch = (data: Appointment[]) =>
    data
      .filter((item) => {
        if (!item.date) return true;
        const apptDate = new Date(item.date);
        const start = dateRange.start ? new Date(dateRange.start) : null;
        const end = dateRange.end ? new Date(dateRange.end) : null;
        return (!start || apptDate >= start) && (!end || apptDate <= end);
      })
      .filter((item) =>
        searchQuery
          ? item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.specialistName
              .toLowerCase()
              .includes(searchQuery.toLowerCase())
          : true
      )
      .filter((item) => (statusFilter ? item.status === statusFilter : true));

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

  const filteredAppointments = filterByDateRangeAndSearch(appointments);
  const filteredClientAppointments = isSpecialist
    ? filterByDateRangeAndSearch(clientAppointments)
    : [];

  const allFilteredAppointments = [
    ...filteredAppointments.map((appt) => ({ ...appt, type: "client" })),
    ...filteredClientAppointments.map((appt) => ({
      ...appt,
      type: "specialist",
    })),
  ];

  const getEventStyle = (event: Event) => {
    const resource = event.resource as {
      appointment: Appointment;
      isOwnerSpecialist: boolean;
    };
    const { isOwnerSpecialist, appointment } = resource;
    const status = appointment.status;

    let color = "#000000"; // default

    if (status === "upcoming") {
      color = isOwnerSpecialist ? "#90EE90" : "#ADD8E6"; // Light Green for specialist, Light Blue for client
    } else if (status === "completed") {
      color = isOwnerSpecialist ? "#228B22" : "#0000FF"; // Dark Green for specialist, Blue for client
    } else if (status === "cancelled") {
      color = "#808080"; // Gray for both
    } else if (status === "disputed") {
      color = "#FF0000"; // Red for both
    }

    return { style: { backgroundColor: color } };
  };

  const calendarEvents = allFilteredAppointments.map((appt) => {
    const isOwnerSpecialist = appt.type === "specialist";
    const displayName = isOwnerSpecialist ? appt.name : appt.specialistName;
    const start = moment(`${appt.date} ${appt.time}`).toDate();
    const end = moment(start).add(1, "hours").toDate(); // Assuming 1 hour duration
    return {
      title: `${displayName} - ${appt.time} (${appt.status})`,
      start,
      end,
      resource: {
        appointment: appt,
        isOwnerSpecialist,
        displayName,
      },
    };
  });

  if (status === "loading" || loading) {
    return (
      <motion.div
        className="space-y-6 w-full max-w-7xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
          <CardHeader>
            <Skeleton className="h-8 w-48 bg-[#C4C4C4]/50" />
            <Skeleton className="h-4 w-64 mt-2 bg-[#C4C4C4]/50" />
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            <Skeleton className="h-10 w-full sm:w-2/3 bg-[#C4C4C4]/50" />
            <Skeleton className="h-10 w-full sm:w-1/3 bg-[#C4C4C4]/50" />
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
      className="space-y-6 w-full max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
        <CardHeader>
          <motion.div variants={itemVariants}>
            <CardTitle className="text-2xl font-bold text-black dark:text-white">
              Your Appointments
            </CardTitle>
            <p className="text-sm opacity-80">Manage your scheduled sessions</p>
          </motion.div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center mb-6 w-full space-y-2 sm:space-y-0 sm:space-x-2">
            <div className="relative flex-grow w-full">
              <Search className="absolute left-3 top-1/2 h-6 w-6 -translate-y-1/2 text-[#fff]" />
              <Input
                type="text"
                placeholder="Search by client or specialist name..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="p-2 pl-10 rounded border-[#F3CFC6] text-black dark:text-white focus:ring-[#F3CFC6]"
              />
            </div>
            <Input
              type="date"
              placeholder="Start Date"
              value={dateRange.start}
              onChange={(e) => handleDateRangeChange("start", e.target.value)}
              className="w-full sm:w-auto text-black dark:text-white"
            />
            <Input
              type="date"
              placeholder="End Date"
              value={dateRange.end}
              onChange={(e) => handleDateRangeChange("end", e.target.value)}
              className="w-full sm:w-auto text-black dark:text-white"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="flex items-center space-x-2 text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20 w-full sm:w-auto"
                >
                  <Filter className="h-6 w-6 text-[#F3CFC6]" />
                  <span>Status</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-white dark:bg-gray-800">
                <DropdownMenuLabel className="text-black dark:text-white">
                  Filter by Status
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleStatusFilterChange("")}
                  className="text-black dark:text-white hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20"
                >
                  All
                </DropdownMenuItem>
                {["upcoming", "completed", "cancelled", "disputed"].map(
                  (status) => (
                    <DropdownMenuItem
                      key={status}
                      onClick={() => handleStatusFilterChange(status)}
                      className="text-black dark:text-white hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20"
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </DropdownMenuItem>
                  )
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardContent className="pt-6">
          {error ? (
            <p className="text-center text-red-500">{error}</p>
          ) : calendarEvents.length > 0 ? (
            <BigCalendar
              localizer={localizer}
              events={calendarEvents}
              startAccessor="start"
              endAccessor="end"
              style={{ height: 600 }}
              onSelectEvent={(event) => setSelected(event.resource)}
              eventPropGetter={getEventStyle}
            />
          ) : (
            <p className="text-center text-[#C4C4C4]">No appointments found.</p>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Appointment Details</DialogTitle>
          </DialogHeader>
          {selected && (
            <AppointmentCard
              appointmentId={selected.appointment._id}
              specialistName={selected.displayName}
              date={selected.appointment.date}
              time={selected.appointment.time}
              rating={selected.appointment.rating || 0}
              reviewCount={selected.appointment.reviewCount || 0}
              rate={selected.appointment.rate || 0}
              status={selected.appointment.status}
              disputeStatus={selected.appointment.disputeStatus}
              isSpecialist={isSpecialist}
              isOwnerSpecialist={selected.isOwnerSpecialist}
              onMessage={() =>
                handleMessageClick(
                  selected.isOwnerSpecialist
                    ? selected.appointment.clientId || ""
                    : selected.appointment.specialistUserId || ""
                )
              }
              onDispute={fetchData}
            />
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
