"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Search } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";

interface Application {
  id: string;
  name: string;
  status: "pending" | "reviewed" | "approved" | "rejected";
  createdAt: string;
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

export default function SpecialistApplicationsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchApplications() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/specialists/application?status=${statusFilter}&search=${searchTerm}`,
          { credentials: "include" }
        );
        if (!response.ok) {
          const errorData = await response.json();
          if (response.status === 401) {
            window.location.href = "/login";
            return;
          }
          throw new Error(errorData.error || "Failed to fetch applications");
        }
        const data = await response.json();
        setApplications(data);
      } catch (err) {
        console.error("Error fetching applications:", err);
        setError(
          err instanceof Error
            ? err.message
            : "An error occurred while fetching applications"
        );
      } finally {
        setLoading(false);
      }
    }
    fetchApplications();
  }, [searchTerm, statusFilter]);

  return (
    <motion.div
      className="space-y-6 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] text-black dark:text-white shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl font-bold">
            <FileText className="mr-2 h-6 w-6" />
            Hug Harmony Professional Applications
          </CardTitle>
          <p className="text-sm opacity-80">
            Review and manage Professional applications.
          </p>
        </CardHeader>
      </Card>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#C4C4C4]" />
          <Input
            placeholder="Search applications by applicant name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 border-[#C4C4C4] focus:ring-[#F3CFC6] dark:bg-black dark:text-white dark:border-[#C4C4C4]"
            aria-label="Search applications"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger
            className="w-[180px] border-[#C4C4C4] focus:ring-[#F3CFC6] dark:bg-black dark:text-white dark:border-[#C4C4C4]"
            aria-label="Filter by status"
          >
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <div className="divide-y divide-[#C4C4C4]">
              <AnimatePresence>
                {error ? (
                  <p className="p-4 text-center text-red-500">{error}</p>
                ) : loading ? (
                  <div className="p-4 space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className="h-16 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"
                      />
                    ))}
                  </div>
                ) : applications.length === 0 ? (
                  <p className="p-4 text-center">No applications found.</p>
                ) : (
                  applications.map((app) => (
                    <motion.div
                      key={app.id}
                      variants={itemVariants}
                      initial="hidden"
                      animate="visible"
                      exit={{ opacity: 0, x: -20 }}
                      className="flex items-center justify-between p-4 hover:bg-[#F3CFC6]/10 dark:hover:bg-[#C4C4C4]/10 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-[#C4C4C4] rounded-full flex items-center justify-center text-black dark:text-white">
                          {app.name[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-black dark:text-white">
                            {app.name}
                          </p>
                          <p className="text-sm text-[#C4C4C4]">
                            <span
                              className={
                                app.status === "pending"
                                  ? "text-yellow-500"
                                  : app.status === "reviewed"
                                    ? "text-green-500"
                                    : app.status === "approved"
                                      ? "text-blue-500"
                                      : "text-red-500"
                              }
                            >
                              {app.status}
                            </span>
                          </p>
                          <p className="text-sm text-[#C4C4C4]">
                            {new Date(app.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="border-[#F3CFC6] text-[#F3CFC6] hover:bg-[#F3CFC6]/20"
                      >
                        <Link
                          href={`/admin/dashboard/specialist-applications/${app.id}`}
                        >
                          View
                        </Link>
                      </Button>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  );
}
