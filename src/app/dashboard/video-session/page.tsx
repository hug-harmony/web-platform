/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Filter, Video } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

interface VideoSession {
  id: string;
  specialist: { name: string; id: string };
  date: string;
  time: string;
  status: "upcoming" | "completed" | "cancelled";
  roomId?: string;
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

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function VideoSessionsPage() {
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const [videoSessions, setVideoSessions] = useState<VideoSession[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "authenticated") {
      fetch(`/api/videoSessions?userId=${session.user.id}`, {
        cache: "no-store",
        credentials: "include",
      })
        .then((res) => {
          if (!res.ok) {
            throw new Error(`Failed to fetch video sessions: ${res.status}`);
          }
          return res.json();
        })
        .then((data) => {
          setVideoSessions(Array.isArray(data) ? data : []);
          setLoading(false);
        })
        .catch((error) => {
          console.error("Error fetching video sessions:", error);
          setLoading(false);
        });
    }
  }, [status, session]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
  };

  const filterSessions = (data: VideoSession[]) =>
    data
      .filter((session) =>
        searchQuery
          ? session.specialist.name
              .toLowerCase()
              .includes(searchQuery.toLowerCase())
          : true
      )
      .filter((session) =>
        statusFilter ? session.status === statusFilter : true
      );

  const filteredSessions = filterSessions(videoSessions);

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
        <Card className="shadow-lg">
          <CardHeader>
            <Skeleton className="h-8 w-48 bg-[#C4C4C4]/50" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-24 w-full bg-[#C4C4C4]/50 rounded-lg"
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
      className="space-y-6 w-full max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
        <CardHeader>
          <motion.div variants={itemVariants}>
            <CardTitle className="text-2xl font-bold text-black dark:text-white">
              Your Video Sessions
            </CardTitle>
            <p className="text-sm opacity-80">
              Manage your video appointments with ease
            </p>
          </motion.div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center mb-6 w-full space-y-2 sm:space-y-0 sm:space-x-2">
            <div className="relative flex-grow w-full">
              <Search className="absolute left-3 top-1/2 h-6 w-6 -translate-y-1/2 text-[#fff]" />
              <Input
                type="text"
                placeholder="Search by specialist name..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="p-2 pl-10 rounded border-[#F3CFC6] text-black dark:text-white focus:ring-[#F3CFC6]"
              />
            </div>
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
                {["upcoming", "completed", "cancelled"].map((status) => (
                  <DropdownMenuItem
                    key={status}
                    onClick={() => handleStatusFilterChange(status)}
                    className="text-black dark:text-white hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20"
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-black dark:text-white">
            <Video className="mr-2 h-6 w-6 text-[#F3CFC6]" />
            All Video Sessions
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
              <TabsTrigger value="upcoming">
                Upcoming (
                {filteredSessions.filter((s) => s.status === "upcoming").length}
                )
              </TabsTrigger>
              <TabsTrigger value="past">
                Past (
                {filteredSessions.filter((s) => s.status !== "upcoming").length}
                )
              </TabsTrigger>
            </TabsList>
            <TabsContent value="upcoming">
              <motion.div className="space-y-4" variants={containerVariants}>
                <AnimatePresence>
                  {filteredSessions
                    .filter((session) => session.status === "upcoming")
                    .map((session) => (
                      <motion.div
                        key={session.id}
                        variants={cardVariants}
                        whileHover={{
                          scale: 1.05,
                          boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
                        }}
                        transition={{ duration: 0.2 }}
                        className="flex items-center justify-between p-4 hover:bg-[#F3CFC6]/10 dark:hover:bg-[#C4C4C4]/10 rounded-md"
                      >
                        <div>
                          <p className="font-semibold text-black dark:text-white">
                            {session.specialist.name}
                          </p>
                          <p className="text-sm text-[#C4C4C4]">
                            {session.date} at {session.time}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20"
                          onClick={() =>
                            router.push(
                              `/dashboard/video-session/${session.id}`
                            )
                          }
                        >
                          Join Session
                        </Button>
                      </motion.div>
                    ))}
                </AnimatePresence>
                {filteredSessions.filter((s) => s.status === "upcoming")
                  .length === 0 && (
                  <p className="text-center text-[#C4C4C4]">
                    No upcoming sessions found.
                  </p>
                )}
              </motion.div>
            </TabsContent>
            <TabsContent value="past">
              <motion.div className="space-y-4" variants={containerVariants}>
                <AnimatePresence>
                  {filteredSessions
                    .filter((session) => session.status !== "upcoming")
                    .map((session) => (
                      <motion.div
                        key={session.id}
                        variants={cardVariants}
                        whileHover={{
                          scale: 1.05,
                          boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
                        }}
                        transition={{ duration: 0.2 }}
                        className="flex items-center justify-between p-4 hover:bg-[#F3CFC6]/10 dark:hover:bg-[#C4C4C4]/10 rounded-md"
                      >
                        <div>
                          <p className="font-semibold text-black dark:text-white">
                            {session.specialist.name}
                          </p>
                          <p className="text-sm text-[#C4C4C4]">
                            {session.date} at {session.time} - {session.status}
                          </p>
                        </div>
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20"
                        >
                          <Link href={`/appointments/${session.id}`}>
                            Details
                          </Link>
                        </Button>
                      </motion.div>
                    ))}
                </AnimatePresence>
                {filteredSessions.filter((s) => s.status !== "upcoming")
                  .length === 0 && (
                  <p className="text-center text-[#C4C4C4]">
                    No past sessions found.
                  </p>
                )}
              </motion.div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  );
}
