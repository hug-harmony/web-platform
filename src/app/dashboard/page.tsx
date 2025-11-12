/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageSquare,
  Clock,
  UserStar,
  UserRoundSearch,
  Video,
  DollarSign,
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { notFound } from "next/navigation";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import HowDidYouHearDialog from "@/components/HowDidYouHearDialog";

// Type definitions
interface User {
  id: string;
  name: string;
  email: string;
  profileImage?: string | null;
  firstName?: string | null;
  heardFrom?: string | null;
}

interface Conversation {
  id: string;
  user1?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    profileImage?: string | null;
  } | null;
  user2?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    profileImage?: string | null;
  } | null;
  professional1?: { id: string; name: string; image?: string | null } | null;
  professional2?: { id: string; name: string; image?: string | null } | null;
  lastMessage?: { text: string; createdAt: string } | null;
  messageCount: number;
}

interface Appointment {
  _id: string;
  name: string;
  professionalName: string;
  date: string;
  time: string;
  location: string;
  status: "upcoming" | "completed" | "cancelled";
  rating?: number | null;
  reviewCount?: number | null;
  rate?: number | null;
  professionalId: string;
}

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

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const [user, setUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: session, status, update } = useSession();
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      if (status === "loading") return;
      if (status === "unauthenticated") {
        router.push("/login");
        return;
      }

      try {
        const id = session?.user?.id;
        if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
          console.error("Invalid user ID format:", id);
          notFound();
        }

        // Fetch user data
        const userRes = await fetch(`/api/users/${id}`, {
          cache: "no-store",
          credentials: "include",
        });

        if (!userRes.ok) {
          console.error(
            "User API response:",
            userRes.status,
            await userRes.text()
          );
          if (userRes.status === 401) router.push("/login");
          if (userRes.status === 404) notFound();
          throw new Error(`Failed to fetch user: ${userRes.status}`);
        }

        const userData = await userRes.json();
        const fullUser: User = {
          id: userData.id,
          name:
            userData.firstName && userData.lastName
              ? `${userData.firstName} ${userData.lastName}`
              : userData.name || "User",
          email: userData.email || "",
          profileImage: userData.profileImage || null,
          firstName: userData.firstName,
          heardFrom: userData.heardFrom,
        };
        setUser(fullUser);

        // Fetch conversations
        const convRes = await fetch("/api/conversations", {
          cache: "no-store",
          credentials: "include",
        });

        if (!convRes.ok) {
          if (convRes.status === 401) {
            router.push("/login");
            return;
          }
          throw new Error(`Failed to fetch conversations: ${convRes.status}`);
        }

        const convData = await convRes.json();
        setConversations(convData);

        // Fetch appointments
        const apptRes = await fetch("/api/appointment", {
          cache: "no-store",
          credentials: "include",
        });

        if (!apptRes.ok) {
          console.error(
            "Appointments API response:",
            apptRes.status,
            await apptRes.text()
          );
          if (apptRes.status === 401) {
            router.push("/login");
            return;
          }
          throw new Error(`Failed to fetch appointments: ${apptRes.status}`);
        }

        const apptData = await apptRes.json();
        setAppointments(
          Array.isArray(apptData)
            ? apptData.map((appt: any) => ({
                _id: appt._id || "",
                name: appt.name || "Unknown",
                professionalId: appt.professionalId || "",
                professionalName:
                  appt.professionalName || "Unknown Professional",
                date: appt.date || "",
                time: appt.time || "",
                location: appt.location || "Unknown",
                status: appt.status || "upcoming",
                rating: appt.rating ?? 0,
                reviewCount: appt.reviewCount ?? 0,
                rate: appt.rate ?? 0,
              }))
            : []
        );
      } catch (err: any) {
        console.error("Fetch Error:", err.message, err.stack);
        setError("Failed to load data. Please try again.");
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [status, session, router]);

  useEffect(() => {
    if (!loading && user && !user.heardFrom) {
      setDialogOpen(true);
    }
  }, [loading, user]);

  const handleConversationClick = (convId: string) => {
    if (!/^[0-9a-fA-F]{24}$/.test(convId)) {
      toast.error("Invalid conversation ID");
      return;
    }
    router.push(`/dashboard/messaging/${convId}`);
  };

  const handleSurveySubmit = async (data: {
    heardFrom: string;
    heardFromOther?: string;
  }) => {
    try {
      const res = await fetch("/api/users/update-hear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Failed to save");

      await update({
        ...session,
        user: {
          ...session?.user,
          heardFrom: data.heardFrom,
          heardFromOther: data.heardFromOther,
        },
      });

      setUser((prev) => (prev ? { ...prev, heardFrom: data.heardFrom } : prev));
      toast.success("Thanks for letting us know!");
    } catch {
      toast.error("Failed to save response");
      throw new Error("save failed");
    }
  };

  // Filter appointments for upcoming and past
  const upcomingAppointments = appointments.filter(
    (appt) => appt.status === "upcoming"
  );
  const pastAppointments = appointments.filter(
    (appt) => appt.status === "completed" || appt.status === "cancelled"
  );

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
            <div className="flex items-center space-x-4">
              <Skeleton className="h-16 w-16 rounded-full bg-[#C4C4C4]/50" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-48 bg-[#C4C4C4]/50" />
                <Skeleton className="h-4 w-64 bg-[#C4C4C4]/50" />
              </div>
            </div>
          </CardHeader>
        </Card>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="shadow-lg">
              <CardContent className="flex items-center space-x-4 p-6">
                <Skeleton className="h-8 w-8 bg-[#C4C4C4]/50" />
                <div className="space-y-2">
                  <Skeleton className="h-6 w-32 bg-[#C4C4C4]/50" />
                  <Skeleton className="h-4 w-48 bg-[#C4C4C4]/50" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="shadow-lg">
          <CardHeader>
            <Skeleton className="h-8 w-48 bg-[#C4C4C4]/50" />
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-2">
                  <div className="flex items-center space-x-3">
                    <Skeleton className="h-10 w-10 rounded-full bg-[#C4C4C4]/50" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32 bg-[#C4C4C4]/50" />
                      <Skeleton className="h-3 w-48 bg-[#C4C4C4]/50" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-16 bg-[#C4C4C4]/50" />
                </div>
              ))}
            </ScrollArea>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader>
            <Skeleton className="h-8 w-48 bg-[#C4C4C4]/50" />
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="upcoming">
              <TabsList className="grid w-full grid-cols-2 bg-[#F3CFC6]/20">
                <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                <TabsTrigger value="past">Past</TabsTrigger>
              </TabsList>
              <TabsContent value="upcoming">
                {[...Array(2)].map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2"
                  >
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32 bg-[#C4C4C4]/50" />
                      <Skeleton className="h-3 w-48 bg-[#C4C4C4]/50" />
                    </div>
                    <Skeleton className="h-8 w-16 bg-[#C4C4C4]/50" />
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  if (error || !user) {
    return (
      <div className="text-center p-6 text-red-500">
        {error || "User data not found."}
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
      {/* Hero Section */}
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] text-black dark:text-white shadow-lg">
        <CardHeader>
          <motion.div
            variants={itemVariants}
            className="flex items-center space-x-4"
          >
            <div onClick={() => router.push(`/dashboard/profile/${user.id}`)}>
              <Avatar className="h-16 w-16 border-2 border-white">
                <AvatarImage src={user.profileImage || ""} alt={user.name} />
                <AvatarFallback className="bg-[#C4C4C4] text-black">
                  {user.name[0] || "?"}
                </AvatarFallback>
              </Avatar>
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">
                Welcome to Hug Harmony, {user.name}!
              </CardTitle>
              <p className="text-sm opacity-80">
                Manage your wellness journey with ease.
              </p>
            </div>
          </motion.div>
        </CardHeader>
      </Card>

      {/* Action Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          {
            href: "/dashboard/professionals",
            label: "Find a Professional",
            icon: <UserStar className="h-8 w-8 text-[#F3CFC6]" />,
            description: "Connect with certified professionals.",
          },
          {
            href: "/dashboard/appointments",
            label: "Appointment Calendar",
            icon: <UserRoundSearch className="h-8 w-8 text-[#F3CFC6]" />,
            description: "Manage your bookings and schedule.",
          },
          {
            href: "/dashboard/forum",
            label: "Forum Discussions",
            icon: <Video className="h-8 w-8 text-[#F3CFC6]" />,
            description: "Join community conversations.",
          },
        ].map((item) => (
          <motion.div
            key={item.href}
            whileHover={{
              scale: 1.05,
              boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
            }}
            transition={{ duration: 0.2 }}
          >
            <Link href={item.href}>
              <Card className="hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20 transition-colors">
                <CardContent className="flex items-center space-x-4 p-6">
                  {item.icon}
                  <div>
                    <h3 className="text-lg font-semibold text-black dark:text-white">
                      {item.label}
                    </h3>
                    <p className="text-sm text-[#C4C4C4]">{item.description}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Recent Messages */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-black dark:text-white">
            <MessageSquare className="mr-2 h-6 w-6 text-[#F3CFC6]" />
            Recent Messages
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[200px]">
            <motion.div className="space-y-4" variants={containerVariants}>
              <AnimatePresence>
                {conversations.length ? (
                  conversations.map((conv) => {
                    let otherParticipant: any | null;
                    let name: string;
                    let profileImage: string | undefined | null;
                    const unread = conv.messageCount > 0;

                    if (conv.user1?.id === session?.user.id) {
                      otherParticipant =
                        conv.user2 || conv.professional2 || null;
                      name = conv.user2
                        ? `${conv.user2.firstName || ""} ${conv.user2.lastName || ""}`.trim() ||
                          "Unknown User"
                        : conv.professional2?.name || "Unknown Professional";
                      profileImage = conv.user2
                        ? conv.user2.profileImage
                        : conv.professional2?.image;
                    } else if (conv.user2?.id === session?.user.id) {
                      otherParticipant =
                        conv.user1 || conv.professional1 || null;
                      name = conv.user1
                        ? `${conv.user1.firstName || ""} ${conv.user1.lastName || ""}`.trim() ||
                          "Unknown User"
                        : conv.professional1?.name || "Unknown Professional";
                      profileImage = conv.user1
                        ? conv.user1.profileImage
                        : conv.professional1?.image;
                    } else if (conv.professional1?.id === session?.user.id) {
                      otherParticipant =
                        conv.user2 || conv.professional2 || null;
                      name = conv.user2
                        ? `${conv.user2.firstName || ""} ${conv.user2.lastName || ""}`.trim() ||
                          "Unknown User"
                        : conv.professional2?.name || "Unknown Professional";
                      profileImage = conv.user2
                        ? conv.user2.profileImage
                        : conv.professional2?.image;
                    } else if (conv.professional2?.id === session?.user.id) {
                      otherParticipant =
                        conv.user1 || conv.professional1 || null;
                      name = conv.user1
                        ? `${conv.user1.firstName || ""} ${conv.user1.lastName || ""}`.trim() ||
                          "Unknown User"
                        : conv.professional1?.name || "Unknown Professional";
                      profileImage = conv.user1
                        ? conv.user1.profileImage
                        : conv.professional1?.image;
                    } else {
                      otherParticipant = null;
                      name = "Unknown Participant";
                      profileImage = undefined;
                    }

                    return (
                      <motion.div
                        key={conv.id}
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        exit={{ opacity: 0, x: -20 }}
                        className="flex items-center justify-between p-2 hover:bg-[#F3CFC6]/10 dark:hover:bg-[#C4C4C4]/10 rounded-md"
                        onClick={() => handleConversationClick(conv.id)}
                      >
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={profileImage || ""} alt={name} />
                            <AvatarFallback className="bg-[#C4C4C4] text-black">
                              {name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold text-black dark:text-white">
                              {name}
                            </p>
                            <p className="text-sm text-[#C4C4C4]">
                              {conv.lastMessage?.text || "No messages"}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-[#C4C4C4]">
                            {conv.lastMessage
                              ? new Date(
                                  conv.lastMessage.createdAt
                                ).toLocaleString([], {
                                  year: "numeric",
                                  month: "numeric",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : ""}
                          </p>
                          {unread && (
                            <Badge variant="destructive">Unread</Badge>
                          )}
                        </div>
                      </motion.div>
                    );
                  })
                ) : (
                  <p className="text-[#C4C4C4]">No messages available.</p>
                )}
              </AnimatePresence>
            </motion.div>
          </ScrollArea>
          <Button asChild variant="link" className="mt-4 text-[#F3CFC6]">
            <Link href="/dashboard/messaging">View All Messages</Link>
          </Button>
        </CardContent>
      </Card>

      {/* Appointments */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-black dark:text-white">
            <Clock className="mr-2 h-6 w-6 text-[#F3CFC6]" />
            Your Appointments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeTab}
            onValueChange={(value) =>
              setActiveTab(value as "upcoming" | "past")
            }
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 bg-[#F3CFC6]/20 dark:bg-[#C4C4C4]/20">
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="past">Past</TabsTrigger>
            </TabsList>
            <TabsContent value="upcoming">
              <motion.div className="space-y-4" variants={containerVariants}>
                <AnimatePresence>
                  {upcomingAppointments.length ? (
                    upcomingAppointments.map((appt) => (
                      <motion.div
                        key={appt._id}
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        exit={{ opacity: 0, x: -20 }}
                        className="flex items-center justify-between p-2 hover:bg-[#F3CFC6]/10 dark:hover:bg-[#C4C4C4]/10 rounded-md"
                      >
                        <div>
                          <p className="font-semibold text-black dark:text-white">
                            {appt.professionalName}
                          </p>
                          <p className="text-sm text-[#C4C4C4]">
                            {appt.date} at {appt.time} - {appt.location}
                          </p>
                        </div>
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="text-[#F3CFC6] border-[#F3CFC6]"
                        >
                          <Link href={`/dashboard/appointments`}>Details</Link>
                        </Button>
                      </motion.div>
                    ))
                  ) : (
                    <p className="text-[#C4C4C4]">No upcoming appointments.</p>
                  )}
                </AnimatePresence>
              </motion.div>
            </TabsContent>
            <TabsContent value="past">
              <motion.div className="space-y-4" variants={containerVariants}>
                <AnimatePresence>
                  {pastAppointments.length ? (
                    pastAppointments.map((appt) => (
                      <motion.div
                        key={appt._id}
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        exit={{ opacity: 0, x: -20 }}
                        className="flex items-center justify-between p-2 hover:bg-[#F3CFC6]/10 dark:hover:bg-[#C4C4C4]/10 rounded-md"
                      >
                        <div>
                          <p className="font-semibold text-black dark:text-white">
                            {appt.professionalName}
                          </p>
                          <p className="text-sm text-[#C4C4C4]">
                            {appt.date} at {appt.time} - {appt.location}
                          </p>
                        </div>
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="text-[#F3CFC6] border-[#F3CFC6]"
                        >
                          <Link href={`/dashboard/appointments`}>Details</Link>
                        </Button>
                      </motion.div>
                    ))
                  ) : (
                    <p className="text-[#C4C4C4]">No past appointments.</p>
                  )}
                </AnimatePresence>
              </motion.div>
            </TabsContent>
          </Tabs>
          <Button asChild variant="link" className="mt-4 text-[#F3CFC6]">
            <Link href="/dashboard/appointments">View All Appointments</Link>
          </Button>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          {
            href: "/dashboard/payment",
            label: "View Payments",
            icon: <DollarSign className="h-8 w-8 text-[#F3CFC6]" />,
            description: "Check your payment history.",
          },
          {
            href: "/dashboard/notes-history",
            label: "Notes & Journal",
            icon: <MessageSquare className="h-8 w-8 text-[#F3CFC6]" />,
            description: "Review your session notes.",
          },
        ].map((item) => (
          <motion.div
            key={item.href}
            whileHover={{
              scale: 1.05,
              boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
            }}
            transition={{ duration: 0.2 }}
          >
            <Link href={item.href}>
              <Card className="hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20 transition-colors shadow-lg">
                <CardContent className="flex items-center space-x-4 p-6">
                  {item.icon}
                  <div>
                    <h3 className="text-lg font-semibold text-black dark:text-white">
                      {item.label}
                    </h3>
                    <p className="text-sm text-[#C4C4C4]">{item.description}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      <HowDidYouHearDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSurveySubmit}
      />
    </motion.div>
  );
}
