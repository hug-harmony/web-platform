/* eslint-disable @typescript-eslint/no-explicit-any */
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
import {
  FileText,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Video,
  DollarSign,
  MapPin,
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import Image from "next/image";

type ProStatus =
  | "FORM_PENDING"
  | "FORM_SUBMITTED"
  | "VIDEO_PENDING"
  | "QUIZ_PENDING"
  | "QUIZ_PASSED"
  | "QUIZ_FAILED"
  | "ADMIN_REVIEW"
  | "APPROVED"
  | "REJECTED";

interface Application {
  id: string;
  name: string;
  avatarUrl: string | null;
  status: ProStatus;
  createdAt: string;
  submittedAt?: string | null;
  videoWatchedAt?: string | null;
  quizPassedAt?: string | null;
  rate: number; // from Application
  venue: "host" | "visit"; // from Application
  video?: {
    watchedSec: number;
    durationSec: number;
    isCompleted: boolean;
  } | null;
  latestQuiz?: {
    score: number;
    attemptedAt: string;
    nextEligibleAt?: string | null;
  } | null;
}

const statusColors: Record<ProStatus, string> = {
  FORM_PENDING: "text-gray-500",
  FORM_SUBMITTED: "text-gray-600",
  VIDEO_PENDING: "text-orange-500",
  QUIZ_PENDING: "text-yellow-500",
  QUIZ_PASSED: "text-green-500",
  QUIZ_FAILED: "text-red-500",
  ADMIN_REVIEW: "text-blue-500",
  APPROVED: "text-emerald-500",
  REJECTED: "text-rose-500",
};

const statusIcons: Record<ProStatus, React.ReactNode> = {
  FORM_PENDING: <Clock className="h-4 w-4" />,
  FORM_SUBMITTED: <FileText className="h-4 w-4" />,
  VIDEO_PENDING: <Video className="h-4 w-4" />,
  QUIZ_PENDING: <Clock className="h-4 w-4" />,
  QUIZ_PASSED: <CheckCircle className="h-4 w-4" />,
  QUIZ_FAILED: <XCircle className="h-4 w-4" />,
  ADMIN_REVIEW: <Clock className="h-4 w-4" />,
  APPROVED: <CheckCircle className="h-4 w-4" />,
  REJECTED: <XCircle className="h-4 w-4" />,
};

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

export default function ProfessionalApplicationsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProStatus | "all">("all");
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (searchTerm) params.set("search", searchTerm);

      const res = await fetch(`/api/professionals/application?${params}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }
        throw new Error(err.error ?? "Failed to fetch");
      }
      const data: Application[] = await res.json();
      setApplications(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

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
            Professional Applications
          </CardTitle>
          <p className="text-sm opacity-80">
            Review onboarding progress and approve professionals.
          </p>
        </CardHeader>
      </Card>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#C4C4C4]" />
          <Input
            placeholder="Search by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 border-[#C4C4C4] focus:ring-[#F3CFC6] dark:bg-black dark:text-white"
          />
        </div>

        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as any)}
        >
          <SelectTrigger className="w-[200px] border-[#C4C4C4] focus:ring-[#F3CFC6] dark:bg-black dark:text-white">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.keys(statusColors).map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-4">
          <ScrollArea className="h-[560px]">
            {error ? (
              <p className="p-4 text-center text-red-500">{error}</p>
            ) : loading ? (
              <SkeletonGrid />
            ) : applications.length === 0 ? (
              <p className="p-4 text-center">No applications found.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AnimatePresence>
                  {applications.map((app) => (
                    <motion.div
                      key={app.id}
                      variants={itemVariants}
                      initial="hidden"
                      animate="visible"
                      exit={{ opacity: 0, x: -20 }}
                      className="flex flex-col p-4 border border-[#C4C4C4] rounded hover:bg-[#F3CFC6]/10 dark:hover:bg-[#C4C4C4]/10 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          {app.avatarUrl ? (
                            <Image
                              src={app.avatarUrl}
                              alt={app.name}
                              width={100}
                              height={100}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 bg-[#C4C4C4] rounded-full flex items-center justify-center">
                              {app.name[0]}
                            </div>
                          )}
                          <div>
                            <p className="font-semibold">{app.name}</p>
                            <p className="text-xs text-[#C4C4C4]">
                              {new Date(app.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div
                          className={`flex items-center gap-1 ${statusColors[app.status]}`}
                        >
                          {statusIcons[app.status]}
                          <span className="text-sm font-medium">
                            {app.status.replace(/_/g, " ")}
                          </span>
                        </div>
                      </div>

                      {/* Rate & Venue */}
                      <div className="text-xs text-[#C4C4C4] mb-1 flex items-center gap-2">
                        <DollarSign className="h-3 w-3" />$
                        {app.rate != null ? app.rate.toFixed(2) : "0.00"} /
                        session
                      </div>
                      <div className="text-xs text-[#C4C4C4] mb-1 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {app.venue === "host" ? "Host" : "Visit"}
                      </div>

                      {/* Video progress */}
                      {app.video && (
                        <div className="text-xs text-[#C4C4C4] mb-1">
                          <span className="flex items-center gap-1">
                            <Video className="h-3 w-3" />
                            {app.video.isCompleted
                              ? "Completed"
                              : `${app.video.watchedSec}s / ${app.video.durationSec}s`}
                          </span>
                        </div>
                      )}

                      {/* Quiz info */}
                      {app.latestQuiz && (
                        <div className="text-xs text-[#C4C4C4] mb-1">
                          Quiz:{" "}
                          <strong>
                            {typeof app.latestQuiz.score === "number"
                              ? app.latestQuiz.score.toFixed(0)
                              : "N/A"}
                            %
                          </strong>{" "}
                          –{" "}
                          {new Date(
                            app.latestQuiz.attemptedAt
                          ).toLocaleDateString()}
                          {app.latestQuiz.nextEligibleAt && (
                            <span className="text-red-500">
                              {" "}
                              retry in{" "}
                              {formatCooldown(app.latestQuiz.nextEligibleAt)}
                            </span>
                          )}
                        </div>
                      )}

                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="mt-2 border-[#F3CFC6] text-[#F3CFC6] hover:bg-[#F3CFC6]/20"
                      >
                        <Link
                          href={`/admin/dashboard/professional-applications/${app.id}`}
                        >
                          View Details
                        </Link>
                      </Button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/** Helper */
function formatCooldown(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  const hrs = Math.floor(ms / 36e5);
  const mins = Math.floor((ms % 36e5) / 6e4);
  return `${hrs}h ${mins}m`;
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="h-40 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"
        />
      ))}
    </div>
  );
}
