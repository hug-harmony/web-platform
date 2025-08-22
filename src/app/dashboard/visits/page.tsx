/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Eye, Search, Calendar } from "lucide-react";
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
  user: {
    id: string;
    name: string;
    avatar?: string | null;
  };
  createdAt: string;
}

interface VisitorStats {
  userId: string;
  name: string;
  avatar?: string | null;
  visitCount: number;
  lastVisit: string;
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

export default function ProfileVisitsPage() {
  const [visits, setVisits] = useState<ProfileVisit[]>([]);
  const [filteredVisitors, setFilteredVisitors] = useState<VisitorStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"today" | "7d" | "30d" | "custom">("7d");
  const [searchQuery, setSearchQuery] = useState("");
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    const fetchVisits = async () => {
      try {
        const response = await fetch(`/api/profile-visits?filter=${filter}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch visits: ${response.status}`);
        }

        const data = await response.json();
        setVisits(data.visits);

        // Aggregate unique visitors
        const visitorMap = new Map<string, VisitorStats>();
        data.visits.forEach((visit: ProfileVisit) => {
          const existing = visitorMap.get(visit.user.id) || {
            userId: visit.user.id,
            name: visit.user.name || "User",
            avatar: visit.user.avatar,
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
      } finally {
        setLoading(false);
      }
    };

    fetchVisits();
  }, [filter, status]);

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
    } catch (error: any) {
      console.error("Error creating conversation:", error);
      toast.error("Failed to start conversation");
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
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
      <div className="p-4 space-y-6 max-w-7xl mx-auto">
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
          <CardContent className="flex space-x-4">
            <Skeleton className="h-10 w-40 rounded-full bg-[#C4C4C4]/50" />
            <Skeleton className="h-10 w-40 rounded-full bg-[#C4C4C4]/50" />
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader>
            <Skeleton className="h-8 w-48 bg-[#C4C4C4]/50" />
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center space-x-2">
              <Skeleton className="h-10 w-full bg-[#C4C4C4]/50" />
              <Skeleton className="h-10 w-40 bg-[#C4C4C4]/50" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-6 w-40 bg-[#C4C4C4]/50" />
              <div className="space-y-2">
                {[...Array(2)].map((_, idx) => (
                  <Skeleton key={idx} className="h-16 w-full bg-[#C4C4C4]/50" />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
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
      {/* Header Section */}
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] text-black dark:text-white shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Profile Visits</CardTitle>
          <p className="text-sm opacity-80">
            {totalVisits} total visits, {uniqueVisitors} unique visitors (
            {filter === "today"
              ? "Today"
              : filter === "7d"
                ? "Last 7 days"
                : filter === "30d"
                  ? "Last 30 days"
                  : "Custom"}
            )
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center mb-6 w-full space-x-2">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 h-6 w-6 -translate-y-1/2 text-[#F3CFC6]" />
              <Input
                type="text"
                placeholder="Search visitors..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="p-2 pl-10 rounded border-[#F3CFC6] text-black dark:text-white focus:ring-[#F3CFC6]"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="flex items-center space-x-2 text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20"
                >
                  <Calendar className="h-6 w-6 text-[#F3CFC6]" />
                  <span>Filter</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-white dark:bg-gray-800">
                <DropdownMenuLabel className="text-black dark:text-white">
                  Time Period
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setFilter("today")}
                  className="text-black dark:text-white hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20"
                >
                  Today
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setFilter("7d")}
                  className="text-black dark:text-white hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20"
                >
                  Last 7 days
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setFilter("30d")}
                  className="text-black dark:text-white hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20"
                >
                  Last 30 days
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setFilter("custom")}
                  className="text-black dark:text-white hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20"
                >
                  Custom
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Visits Content */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-black dark:text-white">
            All Visitors
          </CardTitle>
        </CardHeader>
        <CardContent>
          <motion.div className="space-y-4" variants={containerVariants}>
            <AnimatePresence>
              {error ? (
                <p className="text-red-500 text-center">{error}</p>
              ) : displayedVisitors.length === 0 ? (
                <p className="text-center text-[#C4C4C4]">
                  No profile visits found.
                </p>
              ) : (
                <ScrollArea className="h-[400px]">
                  {displayedVisitors.map((visitor) => (
                    <motion.div
                      key={visitor.userId}
                      variants={itemVariants}
                      initial="hidden"
                      animate="visible"
                      exit={{ opacity: 0, x: -20 }}
                      className="flex items-center justify-between p-2 hover:bg-[#F3CFC6]/10 dark:hover:bg-[#C4C4C4]/10 rounded-md"
                    >
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage
                            src={
                              visitor.avatar ||
                              "/assets/images/avatar-placeholder.png"
                            }
                            alt={visitor.name}
                          />
                          <AvatarFallback className="bg-[#C4C4C4] text-black">
                            {visitor.name[0]}
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
                              className="text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20 rounded-full"
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
                          className="text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20 rounded-full"
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
