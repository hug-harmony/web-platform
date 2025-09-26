/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Filter, Eye, MessageSquare, User } from "lucide-react";
import { useSession } from "next-auth/react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface ProfileVisit {
  id: string;
  user: { id: string; name: string; avatar?: string | null };
  createdAt: string;
}

interface VisitorStats {
  userId: string;
  name: string;
  avatar?: string | null;
  visitCount: number;
  lastVisit: string;
}

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, staggerChildren: 0.2 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function ProfileVisitsPage() {
  const [visits, setVisits] = useState<ProfileVisit[]>([]);
  const [filteredVisitors, setFilteredVisitors] = useState<VisitorStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"today" | "7d" | "30d" | "all">("7d");
  const [searchQuery, setSearchQuery] = useState("");
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    const fetchVisits = async () => {
      try {
        const response = await fetch(`/api/profile-visits?filter=${filter}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });

        if (!response.ok) {
          if (response.status === 401) {
            router.push("/login");
            return;
          }
          throw new Error(`Failed to fetch visits: ${response.status}`);
        }

        const data = await response.json();
        setVisits(Array.isArray(data.visits) ? data.visits : []);

        const visitorMap = new Map<string, VisitorStats>();
        data.visits.forEach((visit: ProfileVisit) => {
          const existing = visitorMap.get(visit.user.id) || {
            userId: visit.user.id,
            name: visit.user.name || "User",
            avatar: visit.user.avatar || null,
            visitCount: 0,
            lastVisit: visit.createdAt,
          };
          existing.visitCount += 1;
          existing.lastVisit =
            new Date(visit.createdAt) > new Date(existing.lastVisit)
              ? visit.createdAt
              : existing.lastVisit;
          visitorMap.set(visit.user.id, existing);
        });
        setFilteredVisitors(Array.from(visitorMap.values()));
      } catch (err: any) {
        console.error("Fetch Visits Error:", err.message);
        setError("Failed to load profile visits. Please try again.");
        toast.error("Failed to load profile visits");
      } finally {
        setLoading(false);
      }
    };

    if (status === "authenticated") {
      fetchVisits();
    }
  }, [filter, status, router]);

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
        throw new Error(`Failed to create conversation: ${res.status}`);
      }
      const conversation = await res.json();
      if (conversation.id) {
        router.push(`/dashboard/messaging/${conversation.id}`);
      } else {
        throw new Error("No conversation ID returned");
      }
    } catch (error: any) {
      console.error("Error creating conversation:", error);
      toast.error("Failed to start conversation");
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleFilterChange = (value: "today" | "7d" | "30d" | "all") => {
    setFilter(value);
  };

  const filterVisitors = (data: VisitorStats[]) =>
    data.filter((visitor) =>
      searchQuery
        ? visitor.name.toLowerCase().includes(searchQuery.toLowerCase())
        : true
    );

  const totalVisits = visits.length;
  const uniqueVisitors = filteredVisitors.length;
  const displayedVisitors = filterVisitors(filteredVisitors);

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
          <CardContent className="space-y-4 pt-6">
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
          <motion.div variants={cardVariants}>
            <CardTitle className="text-2xl font-bold text-black dark:text-white">
              Profile Visits
            </CardTitle>
            <p className="text-sm opacity-80">
              {totalVisits} total visits, {uniqueVisitors} unique visitors (
              {filter === "today"
                ? "Today"
                : filter === "7d"
                  ? "Last 7 days"
                  : filter === "30d"
                    ? "Last 30 days"
                    : "All time"}
              )
            </p>
          </motion.div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center mb-6 w-full space-y-2 sm:space-y-0 sm:space-x-2">
            <div className="relative flex-grow w-full">
              <Search className="absolute left-3 top-1/2 h-6 w-6 -translate-y-1/2 text-[#fff]" />
              <Input
                type="text"
                placeholder="Search by visitor name..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="p-2 pl-10 rounded border-[#F3CFC6] text-black dark:text-white focus:ring-[#F3CFC6]"
              />
            </div>
            <div className="flex space-x-2 w-full sm:w-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex items-center space-x-2 text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20 w-full sm:w-auto"
                  >
                    <Filter className="h-6 w-6 text-[#F3CFC6]" />
                    <span>Filter</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-white dark:bg-gray-800">
                  <DropdownMenuLabel className="text-black dark:text-white">
                    Time Period
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleFilterChange("today")}
                    className="text-black dark:text-white hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20"
                  >
                    Today
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleFilterChange("7d")}
                    className="text-black dark:text-white hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20"
                  >
                    Last 7 days
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleFilterChange("30d")}
                    className="text-black dark:text-white hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20"
                  >
                    Last 30 days
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleFilterChange("all")}
                    className="text-black dark:text-white hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20"
                  >
                    All time
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-black dark:text-white">
            <Filter className="mr-2 h-6 w-6 text-[#F3CFC6]" />
            All Visitors
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <motion.div className="space-y-4" variants={containerVariants}>
            <AnimatePresence>
              {error ? (
                <motion.div
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  className="text-red-500 text-center"
                >
                  {error}
                </motion.div>
              ) : displayedVisitors.length === 0 ? (
                <motion.div
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  className="text-center text-[#C4C4C4]"
                >
                  No profile visits found.
                </motion.div>
              ) : (
                <ScrollArea className="h-[400px]">
                  {displayedVisitors.map((visitor) => (
                    <motion.div
                      key={visitor.userId}
                      variants={cardVariants}
                      whileHover={{
                        scale: 1.0,
                      }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center justify-between p-2 hover:bg-[#F3CFC6]/10 dark:hover:bg-[#C4C4C4]/10 rounded-md"
                    >
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10 border-2 border-white">
                          <AvatarImage
                            src={visitor.avatar || undefined}
                            alt={visitor.name}
                          />
                          <AvatarFallback className="bg-[#C4C4C4] text-black flex items-center justify-center">
                            <User className="h-6 w-6 text-[#F3CFC6]" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-black dark:text-white">
                            {visitor.name}
                          </p>
                          <p className="text-sm text-[#C4C4C4]">
                            Last visit:{" "}
                            {new Date(visitor.lastVisit).toLocaleString()} •{" "}
                            {visitor.visitCount} visit
                            {visitor.visitCount > 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20"
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View Visits
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-white dark:bg-gray-800">
                            <DialogHeader>
                              <DialogTitle className="text-black dark:text-white">
                                Visit Timeline for {visitor.name}
                              </DialogTitle>
                            </DialogHeader>
                            <ScrollArea className="h-[300px]">
                              {visits
                                .filter((v) => v.user.id === visitor.userId)
                                .map((visit) => (
                                  <div
                                    key={visit.id}
                                    className="p-2 border-b border-[#F3CFC6]/20"
                                  >
                                    <p className="text-sm text-[#C4C4C4]">
                                      Visited on{" "}
                                      {new Date(
                                        visit.createdAt
                                      ).toLocaleString()}
                                    </p>
                                  </div>
                                ))}
                            </ScrollArea>
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20"
                          onClick={() => handleMessageClick(visitor.userId)}
                        >
                          <MessageSquare className="mr-2 h-4 w-4" />
                          Message
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </ScrollArea>
              )}
            </AnimatePresence>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
