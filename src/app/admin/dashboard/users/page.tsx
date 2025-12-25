/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Search } from "lucide-react";
import Link from "next/link";
import { useState, useCallback, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

interface User {
  id: string;
  name: string;
  email: string;
  profileImage: string;
  status: "active" | "suspended";
  createdAt: string;
  lastOnline: string | null;
  stats: {
    appointments: number;
    posts: number;
  };
  professionalApplication?: {
    status: string | null;
    professionalId: string | null;
  };
}

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

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [proFilter, setProFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch all users without pagination
      const response = await fetch(`/api/admin/users?limit=1000`);

      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }

      const data = await response.json();
      setUsers(data.data);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  // Apply filters and sorting
  useEffect(() => {
    let result = [...users];

    // Search filter
    if (searchTerm) {
      result = result.filter(
        (user) =>
          user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((user) => user.status === statusFilter);
    }

    // Professional filter
    if (proFilter !== "all") {
      if (proFilter === "professional") {
        result = result.filter(
          (user) => user.professionalApplication?.professionalId !== null
        );
      } else if (proFilter === "notprofessional") {
        result = result.filter(
          (user) => user.professionalApplication?.professionalId === null
        );
      } else if (proFilter === "pending") {
        result = result.filter(
          (user) =>
            user.professionalApplication?.status &&
            [
              "FORM_PENDING",
              "FORM_SUBMITTED",
              "VIDEO_PENDING",
              "QUIZ_PENDING",
              "ADMIN_REVIEW",
            ].includes(user.professionalApplication.status)
        );
      }
    }

    // Sorting
    const sortMultiplier = sortOrder === "asc" ? 1 : -1;

    result.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name) * sortMultiplier;
        case "createdAt":
          return (
            (new Date(a.createdAt).getTime() -
              new Date(b.createdAt).getTime()) *
            sortMultiplier
          );
        case "lastOnline":
          const aOnline = a.lastOnline ? new Date(a.lastOnline).getTime() : 0;
          const bOnline = b.lastOnline ? new Date(b.lastOnline).getTime() : 0;
          return (aOnline - bOnline) * sortMultiplier;
        case "status":
          return a.status.localeCompare(b.status) * sortMultiplier;
        default:
          return 0;
      }
    });

    setFilteredUsers(result);
  }, [users, searchTerm, statusFilter, proFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatLastOnline = (date: string | null) => {
    if (!date) return "Never";
    const lastOnline = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - lastOnline.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getProfessionalStatus = (user: User) => {
    if (!user.professionalApplication?.status) {
      return {
        label: "Not Applied",
        color: "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100",
        icon: "📋",
      };
    }

    const status = user.professionalApplication.status;

    if (user.professionalApplication.professionalId) {
      return {
        label: "✓ Professional",
        color:
          "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100",
        icon: "✅",
      };
    }

    if (
      [
        "FORM_PENDING",
        "FORM_SUBMITTED",
        "VIDEO_PENDING",
        "QUIZ_PENDING",
        "ADMIN_REVIEW",
      ].includes(status)
    ) {
      return {
        label: "Pending Review",
        color: "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100",
        icon: "⏳",
      };
    }

    if (status === "QUIZ_FAILED") {
      return {
        label: "Quiz Failed",
        color:
          "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100",
        icon: "❌",
      };
    }

    if (status === "REJECTED") {
      return {
        label: "Rejected",
        color: "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100",
        icon: "🚫",
      };
    }

    if (status === "SUSPENDED") {
      return {
        label: "Suspended",
        color: "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100",
        icon: "🔴",
      };
    }

    return {
      label: status,
      color: "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100",
      icon: "❓",
    };
  };

  return (
    <motion.div
      className="space-y-6 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] text-black dark:text-white shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-6 w-6" />
              <div>
                <CardTitle className="text-2xl font-bold">
                  Hug Harmony Users
                </CardTitle>
                <p className="text-sm opacity-80">
                  Manage all registered users • Total: {users.length} • Showing:{" "}
                  {filteredUsers.length}
                </p>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Filters & Search */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#C4C4C4]" />
            <Input
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 border-[#C4C4C4] focus:ring-[#F3CFC6] dark:bg-black dark:text-white"
              aria-label="Search users"
            />
          </div>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[180px] border-[#F3CFC6]">
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>

          {/* Professional Filter */}
          <Select value={proFilter} onValueChange={setProFilter}>
            <SelectTrigger className="w-full md:w-[200px] border-[#F3CFC6]">
              <SelectValue placeholder="Filter by Pro Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              <SelectItem value="professional">✓ Professionals</SelectItem>
              <SelectItem value="notprofessional">Not Applied</SelectItem>
              <SelectItem value="pending">Pending Review</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Active Filters */}
        {(searchTerm || statusFilter !== "all" || proFilter !== "all") && (
          <div className="flex flex-wrap gap-2">
            {searchTerm && (
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-[#F3CFC6]/20 dark:bg-[#C4C4C4]/20 rounded-full text-sm text-[#F3CFC6] dark:text-white">
                Search: {searchTerm}
                <button
                  onClick={() => setSearchTerm("")}
                  className="hover:opacity-70"
                >
                  ✕
                </button>
              </span>
            )}
            {statusFilter !== "all" && (
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-[#F3CFC6]/20 dark:bg-[#C4C4C4]/20 rounded-full text-sm text-[#F3CFC6] dark:text-white">
                Status: {statusFilter}
                <button
                  onClick={() => setStatusFilter("all")}
                  className="hover:opacity-70"
                >
                  ✕
                </button>
              </span>
            )}
            {proFilter !== "all" && (
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-[#F3CFC6]/20 dark:bg-[#C4C4C4]/20 rounded-full text-sm text-[#F3CFC6] dark:text-white">
                Pro: {proFilter}
                <button
                  onClick={() => setProFilter("all")}
                  className="hover:opacity-70"
                >
                  ✕
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Users Grid */}
      <Card>
        <CardContent className="p-4">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-48 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"
                />
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-[#C4C4C4]">
              No users found matching your criteria
            </div>
          ) : (
            <ScrollArea className="h-[600px] pr-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AnimatePresence>
                  {filteredUsers.map((user) => {
                    const proStatus = getProfessionalStatus(user);

                    return (
                      <motion.div
                        key={user.id}
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        exit={{ opacity: 0, x: -20 }}
                        className="flex flex-col justify-between p-4 hover:bg-[#F3CFC6]/10 dark:hover:bg-[#C4C4C4]/10 transition-colors border border-[#C4C4C4] rounded"
                      >
                        {/* Top Section - User Info */}
                        <div className="space-y-3">
                          {/* Avatar and Name */}
                          <div className="flex items-start gap-3">
                            <Avatar className="h-12 w-12 border border-[#C4C4C4] flex-shrink-0">
                              <AvatarImage
                                src={
                                  user.profileImage ||
                                  "/assets/images/avatar-placeholder.png"
                                }
                                alt={user.name}
                                className="object-cover"
                              />
                              <AvatarFallback className="bg-[#F3CFC6] text-black text-xs font-bold">
                                {user.name[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-black dark:text-white truncate">
                                {user.name}
                              </p>
                              <p className="text-xs text-[#C4C4C4] truncate">
                                {user.email}
                              </p>
                            </div>
                          </div>

                          {/* Professional Status Badge */}
                          <div>
                            <span
                              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${proStatus.color}`}
                            >
                              {proStatus.icon} {proStatus.label}
                            </span>
                          </div>

                          {/* Stats */}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-[#F3CFC6]/10 dark:bg-[#C4C4C4]/10 rounded p-2">
                              <p className="text-[#C4C4C4]">Appointments</p>
                              <p className="font-semibold text-black dark:text-white">
                                {user.stats.appointments}
                              </p>
                            </div>
                            <div className="bg-[#F3CFC6]/10 dark:bg-[#C4C4C4]/10 rounded p-2">
                              <p className="text-[#C4C4C4]">Posts</p>
                              <p className="font-semibold text-black dark:text-white">
                                {user.stats.posts}
                              </p>
                            </div>
                          </div>

                          {/* Joined & Last Online */}
                          <div className="text-xs space-y-1 text-[#C4C4C4]">
                            <p>Joined: {formatDate(user.createdAt)}</p>
                            <p>
                              Last Online: {formatLastOnline(user.lastOnline)}
                            </p>
                          </div>
                        </div>

                        {/* Bottom Section - Status & Action */}
                        <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#C4C4C4] mt-3">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${
                              user.status === "active"
                                ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100"
                                : "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100"
                            }`}
                          >
                            {user.status === "active" ? "🟢" : "🔴"}{" "}
                            {user.status}
                          </span>
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="border-[#F3CFC6] text-[#F3CFC6] hover:bg-[#F3CFC6]/10"
                          >
                            <Link href={`/admin/dashboard/users/${user.id}`}>
                              View
                            </Link>
                          </Button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
