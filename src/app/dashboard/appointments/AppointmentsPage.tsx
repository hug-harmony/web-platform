// src/app/dashboard/appointments/AppointmentsPage.tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Filter,
  Calendar,
  Clock,
  RefreshCw,
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  View,
} from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import SyncAllCalendarButton from "@/components/SyncAllCalendarButton";

// Types
interface Appointment {
  _id: string;
  professionalName?: string;
  clientName?: string;
  professionalId: string;
  professionalUserId?: string;
  clientId?: string;
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
  professionalId: string;
  startTime: string;
  endTime: string;
  venue?: "host" | "visit";
  status: "pending" | "accepted" | "rejected";
  conversationId: string;
  user: { name: string };
  professional: { name: string; rate: number };
}

type SelectedState =
  | {
      type: "appointment";
      data: Appointment;
      isOwnerProfessional: boolean;
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
    transition: { duration: 0.5, staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

const localizer = momentLocalizer(moment);

// Status color mapping
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  upcoming: { bg: "bg-blue-100", text: "text-blue-700" },
  completed: { bg: "bg-green-100", text: "text-green-700" },
  cancelled: { bg: "bg-gray-100", text: "text-gray-700" },
  disputed: { bg: "bg-red-100", text: "text-red-700" },
  pending: { bg: "bg-yellow-100", text: "text-yellow-700" },
  accepted: { bg: "bg-green-100", text: "text-green-700" },
  rejected: { bg: "bg-red-100", text: "text-red-700" },
};

export default function AppointmentsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  // Data states
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clientAppointments, setClientAppointments] = useState<Appointment[]>(
    []
  );
  const [receivedProposals, setReceivedProposals] = useState<Proposal[]>([]);
  const [sentProposals, setSentProposals] = useState<Proposal[]>([]);

  // UI states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isProfessional, setIsProfessional] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selected, setSelected] = useState<SelectedState>(null);
  const [activeTab, setActiveTab] = useState<"calendar" | "list">("calendar");
  const [calendarView, setCalendarView] = useState<View>("week");
  const [calendarDate, setCalendarDate] = useState(new Date());

  // Fetch all data
  const fetchData = useCallback(
    async (showRefreshToast = false) => {
      if (status === "unauthenticated") {
        router.push("/login");
        return;
      }

      if (showRefreshToast) setRefreshing(true);

      try {
        // ✅ FIX: Correct API endpoint
        const professionalRes = await fetch(
          "/api/professionals/application?me=true",
          {
            cache: "no-store",
            credentials: "include",
          }
        );

        let professionalStatus = false;
        if (professionalRes.ok) {
          const data = await professionalRes.json();
          professionalStatus = data.status === "APPROVED";
          setIsProfessional(professionalStatus);
        }

        // Fetch user appointments and proposals in parallel
        const [userApptsRes, proposalsRes] = await Promise.all([
          fetch("/api/appointment", {
            cache: "no-store",
            credentials: "include",
          }),
          fetch("/api/proposals?role=user", {
            cache: "no-store",
            credentials: "include",
          }),
        ]);

        if (!userApptsRes.ok || !proposalsRes.ok) {
          throw new Error("Failed to fetch initial data");
        }

        const userApptsData = await userApptsRes.json();
        const proposalsData = await proposalsRes.json();

        setAppointments(userApptsData || []);
        setReceivedProposals(proposalsData.proposals || []);

        // If professional, fetch additional data
        if (professionalStatus) {
          const [clientApptsRes, sentProposalsRes] = await Promise.all([
            fetch("/api/appointment/clients", {
              cache: "no-store",
              credentials: "include",
            }),
            fetch("/api/proposals?role=professional", {
              cache: "no-store",
              credentials: "include",
            }),
          ]);

          if (clientApptsRes.ok) {
            const clientApptsData = await clientApptsRes.json();
            setClientAppointments(clientApptsData || []);
          }

          if (sentProposalsRes.ok) {
            const sentProposalsData = await sentProposalsRes.json();
            setSentProposals(sentProposalsData.proposals || []);
          }
        }

        if (showRefreshToast) {
          toast.success("Data refreshed");
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load appointments");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [status, router]
  );

  useEffect(() => {
    if (status === "authenticated") {
      fetchData();
    } else if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router, fetchData]);

  // Handle proposal status update
  const handleProposalStatusUpdate = useCallback(
    async (proposalId: string, newStatus: "accepted" | "rejected") => {
      try {
        const res = await fetch(`/api/proposals/${proposalId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
          credentials: "include",
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || `Failed to ${newStatus} proposal`);
        }

        toast.success(
          newStatus === "accepted"
            ? "Proposal accepted! Appointment created."
            : "Proposal rejected."
        );

        setSelected(null);
        await fetchData();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Action failed");
      }
    },
    [fetchData]
  );

  // Handle message action
  const handleMessage = useCallback(
    async (appt: Appointment, isOwnerProfessional: boolean) => {
      const recipientId = isOwnerProfessional
        ? appt.clientId
        : appt.professionalUserId;

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
        toast.error(
          err instanceof Error ? err.message : "Failed to start chat"
        );
      }
    },
    [router]
  );

  // Filter appointments
  const filteredAppointments = useMemo(() => {
    const all = [
      ...appointments.map((a) => ({ ...a, type: "client" as const })),
      ...clientAppointments.map((a) => ({
        ...a,
        type: "professional" as const,
      })),
    ];

    return all.filter((item) => {
      const nameToSearch =
        item.type === "professional" ? item.clientName : item.professionalName;
      const matchesSearch = searchQuery
        ? nameToSearch?.toLowerCase().includes(searchQuery.toLowerCase())
        : true;
      const matchesStatus = statusFilter ? item.status === statusFilter : true;
      return matchesSearch && matchesStatus;
    });
  }, [appointments, clientAppointments, searchQuery, statusFilter]);

  // Filter proposals
  const filteredProposals = useMemo(() => {
    const all = [
      ...receivedProposals.map((p) => ({ ...p, isReceived: true })),
      ...sentProposals.map((p) => ({ ...p, isReceived: false })),
    ];

    return all.filter((p) => {
      const nameToSearch = p.isReceived ? p.professional.name : p.user.name;
      const matchesSearch = searchQuery
        ? nameToSearch.toLowerCase().includes(searchQuery.toLowerCase())
        : true;
      const matchesStatus = statusFilter ? p.status === statusFilter : true;
      return matchesSearch && matchesStatus;
    });
  }, [receivedProposals, sentProposals, searchQuery, statusFilter]);

  // Calendar events
  const calendarEvents = useMemo(() => {
    const appointmentEvents = filteredAppointments.map((appt) => {
      const isOwnerProfessional = appt.type === "professional";
      const displayName = isOwnerProfessional
        ? appt.clientName
        : appt.professionalName;
      return {
        title: `${displayName}`,
        start: new Date(appt.startTime),
        end: new Date(appt.endTime),
        resource: {
          type: "appointment" as const,
          data: appt,
          isOwnerProfessional,
          displayName,
          status: appt.status,
        },
      };
    });

    const proposalEvents = filteredProposals
      .filter((proposal) => proposal.startTime && proposal.endTime)
      .map((proposal) => {
        const displayName = proposal.isReceived
          ? proposal.professional.name
          : proposal.user.name;
        return {
          title: `📋 ${displayName}`,
          start: new Date(proposal.startTime),
          end: new Date(proposal.endTime),
          resource: {
            type: "proposal" as const,
            data: proposal,
            isReceived: proposal.isReceived,
            status: proposal.status,
          },
        };
      });

    return [...appointmentEvents, ...proposalEvents];
  }, [filteredAppointments, filteredProposals]);

  // Calendar event styling
  const getEventStyle = useCallback((event: Event) => {
    const resource = event.resource as { type: string; status: string };
    if (!resource) return {};

    let backgroundColor = "#3174ad";
    let borderColor = "#2563eb";

    if (resource.type === "appointment") {
      switch (resource.status) {
        case "upcoming":
          backgroundColor = "#3b82f6";
          borderColor = "#2563eb";
          break;
        case "completed":
          backgroundColor = "#10b981";
          borderColor = "#059669";
          break;
        case "cancelled":
          backgroundColor = "#6b7280";
          borderColor = "#4b5563";
          break;
        case "disputed":
          backgroundColor = "#ef4444";
          borderColor = "#dc2626";
          break;
      }
    } else {
      switch (resource.status) {
        case "pending":
          backgroundColor = "#f59e0b";
          borderColor = "#d97706";
          break;
        case "accepted":
          backgroundColor = "#10b981";
          borderColor = "#059669";
          break;
        case "rejected":
          backgroundColor = "#ef4444";
          borderColor = "#dc2626";
          break;
      }
    }

    return {
      style: {
        backgroundColor,
        borderColor,
        borderWidth: "2px",
        borderRadius: "4px",
      },
    };
  }, []);

  // Stats
  const stats = useMemo(() => {
    const allAppointments = [...appointments, ...clientAppointments];
    const allProposals = [...receivedProposals, ...sentProposals];

    return {
      upcoming: allAppointments.filter((a) => a.status === "upcoming").length,
      completed: allAppointments.filter((a) => a.status === "completed").length,
      pendingProposals: allProposals.filter((p) => p.status === "pending")
        .length,
      total: allAppointments.length,
    };
  }, [appointments, clientAppointments, receivedProposals, sentProposals]);

  // Loading state
  if (status === "loading" || loading) {
    return <AppointmentsSkeleton />;
  }

  return (
    <motion.div
      className="p-4 space-y-6 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
        <CardHeader className="pb-2">
          <motion.div variants={itemVariants}>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold text-black flex items-center gap-2">
                  <Calendar className="h-6 w-6" />
                  Your Appointments
                </CardTitle>
                <p className="text-sm text-black/70 mt-1">
                  Manage your scheduled sessions and proposals
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchData(true)}
                disabled={refreshing}
                className="rounded-full bg-white/80 hover:bg-white"
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>
          </motion.div>
        </CardHeader>
        <CardContent>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-white/80 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-blue-600">
                {stats.upcoming}
              </p>
              <p className="text-xs text-gray-600">Upcoming</p>
            </div>
            <div className="bg-white/80 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-600">
                {stats.completed}
              </p>
              <p className="text-xs text-gray-600">Completed</p>
            </div>
            <div className="bg-white/80 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-yellow-600">
                {stats.pendingProposals}
              </p>
              <p className="text-xs text-gray-600">Pending</p>
            </div>
            <div className="bg-white/80 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-gray-600">{stats.total}</p>
              <p className="text-xs text-gray-600">Total</p>
            </div>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="relative flex-grow w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto bg-white">
                  <Filter className="mr-2 h-4 w-4" />
                  {statusFilter
                    ? statusFilter.charAt(0).toUpperCase() +
                      statusFilter.slice(1)
                    : "All Status"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setStatusFilter("")}>
                  All
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-gray-500">
                  Appointments
                </DropdownMenuLabel>
                {["upcoming", "completed", "cancelled", "disputed"].map((s) => (
                  <DropdownMenuItem key={s} onSelect={() => setStatusFilter(s)}>
                    <Badge
                      className={`${STATUS_COLORS[s].bg} ${STATUS_COLORS[s].text} mr-2`}
                    >
                      {s}
                    </Badge>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-gray-500">
                  Proposals
                </DropdownMenuLabel>
                {["pending", "accepted", "rejected"].map((s) => (
                  <DropdownMenuItem key={s} onSelect={() => setStatusFilter(s)}>
                    <Badge
                      className={`${STATUS_COLORS[s].bg} ${STATUS_COLORS[s].text} mr-2`}
                    >
                      {s}
                    </Badge>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Card className="shadow-lg">
        <CardContent className="pt-6">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as "calendar" | "list")}
            >
              <TabsList>
                <TabsTrigger
                  value="calendar"
                  className="flex items-center gap-2"
                >
                  <CalendarDays className="h-4 w-4" />
                  Calendar
                </TabsTrigger>
                <TabsTrigger value="list" className="flex items-center gap-2">
                  <CalendarRange className="h-4 w-4" />
                  List
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-2">
              {activeTab === "calendar" && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCalendarDate(new Date())}
                  >
                    Today
                  </Button>
                  <div className="flex items-center border rounded-lg">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newDate = new Date(calendarDate);
                        if (calendarView === "month") {
                          newDate.setMonth(newDate.getMonth() - 1);
                        } else {
                          newDate.setDate(newDate.getDate() - 7);
                        }
                        setCalendarDate(newDate);
                      }}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="px-3 text-sm font-medium">
                      {moment(calendarDate).format(
                        calendarView === "month" ? "MMMM YYYY" : "MMM D, YYYY"
                      )}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newDate = new Date(calendarDate);
                        if (calendarView === "month") {
                          newDate.setMonth(newDate.getMonth() + 1);
                        } else {
                          newDate.setDate(newDate.getDate() + 7);
                        }
                        setCalendarDate(newDate);
                      }}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        {calendarView.charAt(0).toUpperCase() +
                          calendarView.slice(1)}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        onSelect={() => setCalendarView("month")}
                      >
                        Month
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => setCalendarView("week")}
                      >
                        Week
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setCalendarView("day")}>
                        Day
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
              {session?.user?.id && (
                <SyncAllCalendarButton className="rounded-full" />
              )}
            </div>
          </div>

          {/* Calendar View */}
          {activeTab === "calendar" && (
            <>
              {calendarEvents.length > 0 ? (
                <BigCalendar
                  localizer={localizer}
                  events={calendarEvents}
                  startAccessor="start"
                  endAccessor="end"
                  style={{ height: 600 }}
                  view={calendarView}
                  onView={setCalendarView}
                  date={calendarDate}
                  onNavigate={setCalendarDate}
                  onSelectEvent={(event) =>
                    setSelected(event.resource as SelectedState)
                  }
                  eventPropGetter={getEventStyle}
                  views={["month", "week", "day"]}
                  toolbar={false}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                  <Calendar className="h-16 w-16 mb-4 opacity-50" />
                  <p className="text-lg font-medium">No appointments found</p>
                  <p className="text-sm">
                    {searchQuery || statusFilter
                      ? "Try adjusting your filters"
                      : "Book your first appointment to get started"}
                  </p>
                </div>
              )}

              {/* Legend */}
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-blue-500"></div>
                  <span>Upcoming</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-green-500"></div>
                  <span>Completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-yellow-500"></div>
                  <span>Pending Proposal</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-gray-500"></div>
                  <span>Cancelled</span>
                </div>
              </div>
            </>
          )}

          {/* List View */}
          {activeTab === "list" && (
            <div className="space-y-6">
              {/* Appointments Section */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Appointments ({filteredAppointments.length})
                </h3>
                {filteredAppointments.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredAppointments.map((appt) => {
                      const isOwnerProfessional = appt.type === "professional";
                      const displayName = isOwnerProfessional
                        ? appt.clientName
                        : appt.professionalName;
                      return (
                        <motion.div key={appt._id} variants={itemVariants}>
                          <Card
                            className="cursor-pointer hover:shadow-md transition-shadow border-l-4"
                            style={{
                              borderLeftColor:
                                appt.status === "upcoming"
                                  ? "#3b82f6"
                                  : appt.status === "completed"
                                    ? "#10b981"
                                    : "#6b7280",
                            }}
                            onClick={() =>
                              setSelected({
                                type: "appointment",
                                data: appt,
                                isOwnerProfessional,
                                displayName: displayName || "Unknown",
                              })
                            }
                          >
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-semibold">{displayName}</p>
                                  <p className="text-sm text-gray-500">
                                    {moment(appt.startTime).format(
                                      "MMM D, YYYY • h:mm A"
                                    )}
                                  </p>
                                </div>
                                <Badge
                                  className={`${STATUS_COLORS[appt.status].bg} ${STATUS_COLORS[appt.status].text}`}
                                >
                                  {appt.status}
                                </Badge>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    No appointments found
                  </p>
                )}
              </div>

              {/* Proposals Section */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <CalendarRange className="h-5 w-5" />
                  Proposals ({filteredProposals.length})
                </h3>
                {filteredProposals.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredProposals.map((proposal) => (
                      <ProposalCard
                        key={proposal.id}
                        proposal={proposal}
                        isReceived={proposal.isReceived}
                        isProfessional={isProfessional}
                        onStatusUpdate={handleProposalStatusUpdate}
                        onViewConversation={(convId) =>
                          router.push(`/dashboard/messaging/${convId}`)
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    No proposals found
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <DialogContent className="max-w-lg">
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
              isProfessional={isProfessional}
              isOwnerProfessional={selected.isOwnerProfessional}
              onMessage={() =>
                handleMessage(selected.data, selected.isOwnerProfessional)
              }
              onUpdate={() => {
                setSelected(null);
                fetchData();
              }}
            />
          )}
          {selected?.type === "proposal" && (
            <ProposalCard
              proposal={selected.data}
              isReceived={selected.isReceived}
              isProfessional={isProfessional}
              onStatusUpdate={handleProposalStatusUpdate}
              onViewConversation={(convId) => {
                setSelected(null);
                router.push(`/dashboard/messaging/${convId}`);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

// Skeleton loader
function AppointmentsSkeleton() {
  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto">
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4]">
        <CardHeader>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-3 mb-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-32" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-[500px] w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
