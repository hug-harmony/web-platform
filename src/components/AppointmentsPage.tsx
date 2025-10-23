/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useState, useEffect, useMemo } from "react";
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
import ProposalCard from "@/components/ProposalCard";
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

// Updated interfaces
interface Appointment {
  _id: string;
  specialistName?: string;
  clientName?: string;
  specialistId: string;
  specialistUserId?: string; // ← NEW: User ID of specialist
  clientId?: string; // ← NEW: User ID of client
  startTime: string;
  endTime: string;
  status: "upcoming" | "completed" | "cancelled" | "disputed";
  rating?: number | null;
  reviewCount?: number | null;
  rate?: number | null;
  disputeStatus: string;
}

interface Proposal {
  id: string;
  userId: string;
  specialistId: string;
  date: string;
  time: string;
  status: "pending" | "accepted" | "rejected";
  conversationId: string;
  user: { name: string };
  specialist: { name: string; rate: number };
}

type SelectedState =
  | {
      type: "appointment";
      data: Appointment;
      isOwnerSpecialist: boolean;
      displayName: string;
    }
  | {
      type: "proposal";
      data: Proposal;
      isReceived: boolean;
    }
  | null;

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
  const [receivedProposals, setReceivedProposals] = useState<Proposal[]>([]);
  const [sentProposals, setSentProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSpecialist, setIsSpecialist] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selected, setSelected] = useState<SelectedState>(null);

  const fetchData = async () => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    try {
      const specialistRes = await fetch("/api/specialists/application/me", {
        cache: "no-store",
      });
      let specialistStatus = false;
      if (specialistRes.ok) {
        const { status: appStatus } = await specialistRes.json();
        specialistStatus = appStatus === "approved";
        setIsSpecialist(specialistStatus);
      }

      const [userApptsRes, proposalsRes] = await Promise.all([
        fetch("/api/appointment", { cache: "no-store" }),
        fetch(`/api/proposals?role=user`, { cache: "no-store" }),
      ]);

      if (!userApptsRes.ok || !proposalsRes.ok)
        throw new Error("Failed to fetch initial data");

      const userApptsData = await userApptsRes.json();
      const proposalsData = await proposalsRes.json();

      setAppointments(userApptsData || []);
      setReceivedProposals(proposalsData.proposals || []);

      if (specialistStatus) {
        const [clientApptsRes, sentProposalsRes] = await Promise.all([
          fetch("/api/appointment/clients", { cache: "no-store" }),
          fetch(`/api/proposals?role=specialist`, { cache: "no-store" }),
        ]);

        if (!clientApptsRes.ok || !sentProposalsRes.ok)
          throw new Error("Failed to fetch specialist data");

        const clientApptsData = await clientApptsRes.json();
        const sentProposalsData = await sentProposalsRes.json();

        setClientAppointments(clientApptsData || []);
        setSentProposals(sentProposalsData.proposals || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load appointments and proposals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchData();
    } else if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Unified message handler
  const handleMessage = async (
    appt: Appointment,
    isOwnerSpecialist: boolean
  ) => {
    const recipientId = isOwnerSpecialist
      ? appt.clientId
      : appt.specialistUserId;
    if (!recipientId) {
      toast.error("Cannot start chat: missing user ID");
      return;
    }

    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId }),
        credentials: "include",
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to start chat");
      }

      const { id } = await res.json();
      router.push(`/dashboard/messaging/${id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start chat");
    }
  };

  const filteredAppointments = useMemo(() => {
    const all = [
      ...appointments.map((a) => ({ ...a, type: "client" as const })),
      ...clientAppointments.map((a) => ({ ...a, type: "specialist" as const })),
    ];

    return all.filter((item) => {
      const nameToSearch =
        item.type === "specialist" ? item.clientName : item.specialistName;
      return (
        (searchQuery
          ? nameToSearch?.toLowerCase().includes(searchQuery.toLowerCase())
          : true) && (statusFilter ? item.status === statusFilter : true)
      );
    });
  }, [appointments, clientAppointments, searchQuery, statusFilter]);

  const filteredProposals = useMemo(() => {
    const all = [
      ...receivedProposals.map((p) => ({ ...p, isReceived: true })),
      ...sentProposals.map((p) => ({ ...p, isReceived: false })),
    ];
    return all.filter((p) => {
      const nameToSearch = p.isReceived ? p.specialist.name : p.user.name;
      return (
        (searchQuery
          ? nameToSearch.toLowerCase().includes(searchQuery.toLowerCase())
          : true) && (statusFilter ? p.status === statusFilter : true)
      );
    });
  }, [receivedProposals, sentProposals, searchQuery, statusFilter]);

  const calendarEvents = useMemo(() => {
    const appointmentEvents = filteredAppointments.map((appt) => {
      const isOwnerSpecialist = appt.type === "specialist";
      const displayName = isOwnerSpecialist
        ? appt.clientName
        : appt.specialistName;
      return {
        title: `${displayName} (${appt.status})`,
        start: new Date(appt.startTime),
        end: new Date(appt.endTime),
        resource: {
          type: "appointment" as const,
          data: appt,
          isOwnerSpecialist,
          displayName,
        },
      };
    });

    const proposalEvents = filteredProposals.map((proposal) => {
      const displayName = proposal.isReceived
        ? proposal.specialist.name
        : proposal.user.name;
      const start = moment(`${proposal.date} ${proposal.time}`).toDate();
      return {
        title: `Proposal: ${displayName} (${proposal.status})`,
        start,
        end: moment(start).add(1, "hour").toDate(),
        resource: {
          type: "proposal" as const,
          data: proposal,
          isReceived: proposal.isReceived,
        },
      };
    });

    return [...appointmentEvents, ...proposalEvents];
  }, [filteredAppointments, filteredProposals]);

  const getEventStyle = (event: Event) => {
    const resource = event.resource as SelectedState;
    if (!resource) return {};
    const { type, data } = resource;

    let color = "#3174ad";
    if (type === "appointment") {
      if (data.status === "upcoming")
        color = resource.isOwnerSpecialist ? "#5cb85c" : "#5bc0de";
      if (data.status === "completed")
        color = resource.isOwnerSpecialist ? "#4cae4c" : "#46b8da";
      if (data.status === "cancelled") color = "#777777";
      if (data.status === "disputed") color = "#d9534f";
    } else {
      if (data.status === "pending") color = "#f0ad4e";
      if (data.status === "accepted") color = "#5cb85c";
      if (data.status === "rejected") color = "#d43f3a";
    }
    return { style: { backgroundColor: color, borderColor: "darkgrey" } };
  };

  if (status === "loading" || loading) {
    return (
      <div className="p-4">
        <Skeleton className="h-[70vh] w-full" />
      </div>
    );
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
            <CardTitle className="text-2xl font-bold text-black">
              Your Appointments
            </CardTitle>
            <p className="text-sm opacity-80">
              Manage and view your scheduled sessions and proposals.
            </p>
          </motion.div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="relative flex-grow w-full">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="p-2 pl-10"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                  <Filter className="mr-2 h-4 w-4" /> Status
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {[
                  "",
                  "upcoming",
                  "completed",
                  "cancelled",
                  "disputed",
                  "pending",
                  "accepted",
                  "rejected",
                ].map((s) => (
                  <DropdownMenuItem
                    key={s || "all"}
                    onSelect={() => setStatusFilter(s)}
                  >
                    {s ? s.charAt(0).toUpperCase() + s.slice(1) : "All"}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardContent className="pt-6">
          {calendarEvents.length > 0 ? (
            <BigCalendar
              localizer={localizer}
              events={calendarEvents}
              startAccessor="start"
              endAccessor="end"
              style={{ height: 600 }}
              onSelectEvent={(event) =>
                setSelected(event.resource as SelectedState)
              }
              eventPropGetter={getEventStyle}
            />
          ) : (
            <p className="text-center text-gray-500 py-10">
              No appointments or proposals match your filters.
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selected?.type === "appointment"
                ? "Appointment Details"
                : "Proposal Details"}
            </DialogTitle>
          </DialogHeader>
          {selected?.type === "appointment" && (
            <AppointmentCard
              appointment={selected.data}
              isSpecialist={isSpecialist}
              isOwnerSpecialist={selected.isOwnerSpecialist}
              onMessage={() =>
                handleMessage(selected.data, selected.isOwnerSpecialist)
              }
              onUpdate={fetchData}
            />
          )}
          {selected?.type === "proposal" && (
            <ProposalCard
              proposal={selected.data}
              isReceived={selected.isReceived}
              isSpecialist={isSpecialist}
              onStatusUpdate={fetchData}
              onViewConversation={() => {
                router.push(
                  `/dashboard/messaging/${selected.data.conversationId}`
                );
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
