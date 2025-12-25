// src/app/admin/dashboard/professional-applications/page.tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  RefreshCw,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowUpDown,
  Eye,
  DollarSign,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import {
  STATUS_CONFIG,
  VENUE_ICONS,
  formatCooldown,
  formatVideoProgress,
  type ProOnboardingStatus,
} from "@/lib/constants/application-status";

interface Application {
  id: string;
  name: string;
  avatarUrl: string | null;
  status: ProOnboardingStatus;
  createdAt: string;
  submittedAt?: string | null;
  videoWatchedAt?: string | null;
  quizPassedAt?: string | null;
  rate: number;
  venue: string;
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
  professionalId?: string | null;
}

const RELEVANT_STATUSES: ProOnboardingStatus[] = [
  "VIDEO_PENDING",
  "QUIZ_PENDING",
  "QUIZ_FAILED",
  "ADMIN_REVIEW",
  "APPROVED",
  "REJECTED",
];

export default function ProfessionalApplicationsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ProOnboardingStatus>(
    "all"
  );
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
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
        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }
        const err = await res.json();
        throw new Error(err.error ?? "Failed to fetch applications");
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

  const filteredAndSorted = useMemo(() => {
    let filtered = applications;

    if (searchTerm) {
      filtered = filtered.filter((a) =>
        a.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((a) => a.status === statusFilter);
    }

    return filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortBy === "newest" ? dateB - dateA : dateA - dateB;
    });
  }, [applications, searchTerm, statusFilter, sortBy]);

  const stats = useMemo(() => {
    const now = Date.now();
    return {
      total: applications.length,
      needsAttention:
        applications.filter((a) => a.status === "ADMIN_REVIEW").length +
        applications.filter(
          (a) =>
            a.status === "QUIZ_FAILED" &&
            (!a.latestQuiz?.nextEligibleAt ||
              new Date(a.latestQuiz.nextEligibleAt).getTime() <= now)
        ).length,
      pendingReview: applications.filter((a) => a.status === "ADMIN_REVIEW")
        .length,
      approved: applications.filter((a) => a.status === "APPROVED").length,
      rejected: applications.filter((a) => a.status === "REJECTED").length,
    };
  }, [applications]);

  const timeSince = (date: string) => {
    const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
    const diff = Date.now() - new Date(date).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days < 1) return "Today";
    if (days < 7) return rtf.format(-days, "day");
    if (days < 30) return rtf.format(-Math.floor(days / 7), "week");
    return new Date(date).toLocaleDateString();
  };

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center text-2xl font-bold text-black">
                <FileText className="mr-2 h-6 w-6" />
                Professional Applications
              </CardTitle>
              <p className="text-sm text-black/70 mt-1">
                Review and manage professional onboarding applications
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchApplications}
              disabled={loading}
              className="rounded-full"
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatsCard
          label="Total"
          value={stats.total}
          icon={<Users className="h-5 w-5" />}
          color="bg-gray-100 text-gray-700"
        />
        <StatsCard
          label="Needs Attention"
          value={stats.needsAttention}
          icon={<AlertTriangle className="h-5 w-5" />}
          color="bg-amber-100 text-amber-700"
          highlight={stats.needsAttention > 0}
        />
        <StatsCard
          label="Pending Review"
          value={stats.pendingReview}
          icon={<Clock className="h-5 w-5" />}
          color="bg-blue-100 text-blue-700"
        />
        <StatsCard
          label="Approved"
          value={stats.approved}
          icon={<CheckCircle className="h-5 w-5" />}
          color="bg-emerald-100 text-emerald-700"
        />
        <StatsCard
          label="Rejected"
          value={stats.rejected}
          icon={<XCircle className="h-5 w-5" />}
          color="bg-rose-100 text-rose-700"
        />
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as any)}
        >
          <SelectTrigger className="w-full lg:w-64">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {RELEVANT_STATUSES.map((status) => {
              const config = STATUS_CONFIG[status];
              return (
                <SelectItem key={status} value={status}>
                  <span className="flex items-center gap-2">
                    <span className={config.color}>{config.label}</span>
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
          <SelectTrigger className="w-full lg:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">
              <ArrowUpDown className="h-4 w-4 inline mr-2" />
              Newest First
            </SelectItem>
            <SelectItem value="oldest">
              <ArrowUpDown className="h-4 w-4 inline mr-2" />
              Oldest First
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-4">
          {error ? (
            <div className="text-center py-12">
              <p className="text-red-500 mb-4">{error}</p>
              <Button onClick={fetchApplications}>Retry</Button>
            </div>
          ) : loading ? (
            <ApplicationsSkeleton />
          ) : filteredAndSorted.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg text-muted-foreground">
                No applications found
              </p>
              {(searchTerm || statusFilter !== "all") && (
                <Button
                  variant="link"
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("all");
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <ScrollArea className="h-[700px] pr-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                <AnimatePresence mode="popLayout">
                  {filteredAndSorted.map((app) => (
                    <ApplicationCard
                      key={app.id}
                      application={app}
                      timeSince={timeSince}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function StatsCard({
  label,
  value,
  icon,
  color,
  highlight = false,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "ring-2 ring-amber-500" : ""}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          <div className={`p-3 rounded-full ${color}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function ApplicationCard({
  application: app,
  timeSince,
}: {
  application: Application;
  timeSince: (date: string) => string;
}) {
  const statusConfig = STATUS_CONFIG[app.status];
  const StatusIcon = statusConfig.icon;

  const isReadyForReview = app.status === "ADMIN_REVIEW";
  const isQuizRetryReady =
    app.status === "QUIZ_FAILED" &&
    app.latestQuiz?.nextEligibleAt &&
    new Date(app.latestQuiz.nextEligibleAt).getTime() <= Date.now();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`relative ${isReadyForReview || isQuizRetryReady ? "ring-2 ring-amber-400" : ""}`}
    >
      <Card className="hover:shadow-lg transition-shadow h-full flex flex-col">
        <CardContent className="p-4 flex-1 flex flex-col">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              {app.avatarUrl ? (
                <Image
                  src={app.avatarUrl}
                  alt={app.name}
                  width={48}
                  height={48}
                  className="rounded-full object-cover"
                />
              ) : (
                <div className="h-12 w-12 bg-[#F3CFC6] rounded-full flex items-center justify-center text-lg font-semibold">
                  {app.name[0]?.toUpperCase()}
                </div>
              )}
              <div>
                <p className="font-semibold">{app.name}</p>
                <p className="text-xs text-muted-foreground">
                  {timeSince(app.createdAt)}
                </p>
              </div>
            </div>
            <Badge
              className={`${statusConfig.bgColor} ${statusConfig.color} border-0`}
            >
              <StatusIcon className="h-3 w-3 mr-1" />
              {statusConfig.label}
            </Badge>
          </div>

          <div className="space-y-2 text-sm flex-1">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1 text-muted-foreground">
                <DollarSign className="h-3.5 w-3.5" />${app.rate.toFixed(2)}/hr
              </span>
              <span className="text-muted-foreground">
                {VENUE_ICONS[app.venue]} {app.venue}
              </span>
            </div>

            {app.video && (
              <div className="text-muted-foreground text-xs">
                Video:{" "}
                {app.video.isCompleted
                  ? "Completed ✓"
                  : `${Math.round((app.video.watchedSec / app.video.durationSec) * 100)}%`}
              </div>
            )}

            {app.latestQuiz && (
              <div className="text-muted-foreground text-xs">
                Quiz: <strong>{app.latestQuiz.score.toFixed(0)}%</strong>
                {isQuizRetryReady && (
                  <span className="text-green-600 ml-2">← Retry ready</span>
                )}
              </div>
            )}
          </div>

          <div className="mt-4">
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link
                href={`/admin/dashboard/professional-applications/${app.id}`}
              >
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </Link>
            </Button>
          </div>

          {(isReadyForReview || isQuizRetryReady) && (
            <div className="absolute -top-2 -right-2">
              <div className="bg-amber-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
                Action Needed
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function ApplicationsSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: 9 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
            <Skeleton className="h-9 w-full mt-4" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
