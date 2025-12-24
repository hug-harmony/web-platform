// src/app/admin/dashboard/professional-applications/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
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
  DollarSign,
  Video,
  Eye,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import {
  STATUS_CONFIG,
  VENUE_ICONS,
  formatCooldown,
  formatVideoProgress,
  type ProOnboardingStatus,
  type VenueType,
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
  venue: VenueType;
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

interface Stats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

export default function ProfessionalApplicationsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProOnboardingStatus | "all">(
    "all"
  );
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

  // Calculate stats
  const stats: Stats = {
    total: applications.length,
    pending: applications.filter((a) => a.status === "ADMIN_REVIEW").length,
    approved: applications.filter((a) => a.status === "APPROVED").length,
    rejected: applications.filter((a) => a.status === "REJECTED").length,
  };

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard
          label="Total"
          value={stats.total}
          icon={<Users className="h-5 w-5" />}
          color="bg-gray-100 text-gray-700"
        />
        <StatsCard
          label="Pending Review"
          value={stats.pending}
          icon={<Clock className="h-5 w-5" />}
          color="bg-blue-100 text-blue-700"
          highlight={stats.pending > 0}
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
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
          onValueChange={(v) =>
            setStatusFilter(v as ProOnboardingStatus | "all")
          }
        >
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                <span className="flex items-center gap-2">
                  <span className={config.color}>{config.label}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Applications List */}
      <Card>
        <CardContent className="p-4">
          {error ? (
            <div className="text-center py-8">
              <p className="text-red-500 mb-4">{error}</p>
              <Button onClick={fetchApplications} variant="outline">
                Try Again
              </Button>
            </div>
          ) : loading ? (
            <ApplicationsSkeleton />
          ) : applications.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No applications found</p>
              {(searchTerm || statusFilter !== "all") && (
                <Button
                  variant="link"
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("all");
                  }}
                  className="mt-2"
                >
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <AnimatePresence mode="popLayout">
                  {applications.map((app) => (
                    <ApplicationCard key={app.id} application={app} />
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

// Stats Card Component
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
    <Card className={highlight ? "ring-2 ring-blue-500" : ""}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          <div className={`p-2 rounded-full ${color}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

// Application Card Component
function ApplicationCard({ application: app }: { application: Application }) {
  const statusConfig = STATUS_CONFIG[app.status];
  const StatusIcon = statusConfig.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          {/* Header */}
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
                  Applied {new Date(app.createdAt).toLocaleDateString()}
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

          {/* Details */}
          <div className="space-y-2 text-sm">
            {/* Rate & Venue */}
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1 text-muted-foreground">
                <DollarSign className="h-3.5 w-3.5" />$
                {app.rate?.toFixed(2) ?? "0.00"}/hr
              </span>
              <span className="text-muted-foreground">
                {VENUE_ICONS[app.venue]} {app.venue}
              </span>
            </div>

            {/* Video Progress */}
            {app.video && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Video className="h-3.5 w-3.5" />
                Video:{" "}
                {app.video.isCompleted ? (
                  <span className="text-green-600">Completed</span>
                ) : (
                  <span>
                    {formatVideoProgress(
                      app.video.watchedSec,
                      app.video.durationSec
                    )}
                  </span>
                )}
              </div>
            )}

            {/* Quiz Info */}
            {app.latestQuiz && (
              <div className="text-muted-foreground">
                Quiz: <strong>{app.latestQuiz.score.toFixed(0)}%</strong>
                {app.latestQuiz.nextEligibleAt &&
                  new Date(app.latestQuiz.nextEligibleAt) > new Date() && (
                    <span className="text-red-500 ml-2">
                      Retry in {formatCooldown(app.latestQuiz.nextEligibleAt)}
                    </span>
                  )}
              </div>
            )}
          </div>

          {/* Action */}
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
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Skeleton Loader
function ApplicationsSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
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
