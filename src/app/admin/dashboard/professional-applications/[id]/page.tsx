// src/app/admin/dashboard/professional-applications/[id]/page.tsx
"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FileText,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Video,
  MapPin,
  DollarSign,
  Calendar,
  User,
  Loader2,
  Mail,
  Clock,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import {
  STATUS_CONFIG,
  VENUE_LABELS,
  VENUE_ICONS,
  formatCooldown,
  type ProOnboardingStatus,
  type VenueType,
} from "@/lib/constants/application-status";

interface Application {
  id: string;
  name: string;
  avatarUrl?: string | null;
  biography: string;
  rate: number;
  venue: VenueType;
  status: ProOnboardingStatus;
  createdAt: string;
  submittedAt?: string | null;
  videoWatchedAt?: string | null;
  quizPassedAt?: string | null;
  video?: {
    watchedSec: number;
    durationSec: number;
    isCompleted: boolean;
  } | null;
  quizAttempts: {
    score: number;
    passed: boolean;
    attemptedAt: string;
    nextEligibleAt?: string | null;
  }[];
  professionalId?: string | null;
}

export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [app, setApp] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Dialog states
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const fetchApplication = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/professionals/application?id=${id}`, {
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        if (res.status === 404) {
          setError("Application not found");
          return;
        }
        const err = await res.json();
        throw new Error(err.error ?? "Failed to fetch application");
      }
      const data: Application = await res.json();
      setApp(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    if (id) fetchApplication();
  }, [id, fetchApplication]);

  const handleStatusUpdate = async (status: "APPROVED" | "REJECTED") => {
    if (!app) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/professionals/application", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: app.id,
          status,
          rejectionReason: status === "REJECTED" ? rejectionReason : undefined,
        }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to update status");
      }
      toast.success(
        status === "APPROVED"
          ? "Application approved! Email sent to user."
          : "Application rejected. Email sent to user."
      );
      setApproveDialogOpen(false);
      setRejectDialogOpen(false);
      setRejectionReason("");
      await fetchApplication();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <DetailSkeleton />;
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-red-500 mb-4">{error}</p>
        <div className="flex gap-3">
          <Button onClick={fetchApplication} variant="outline">
            Try Again
          </Button>
          <Button asChild variant="ghost">
            <Link href="/admin/dashboard/professional-applications">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to List
            </Link>
          </Button>
        </div>
      </div>
    );
  }
  if (!app) return null;

  const statusConfig = STATUS_CONFIG[app.status];
  const StatusIcon = statusConfig.icon;
  const canApprove = app.status === "ADMIN_REVIEW";
  const canReject = !["APPROVED", "REJECTED", "SUSPENDED"].includes(app.status);

  return (
    <motion.div
      className="space-y-6 max-w-4xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href="/admin/dashboard/professional-applications"
          className="hover:text-foreground transition-colors"
        >
          Professional Applications
        </Link>
        <span>/</span>
        <span className="text-foreground">{app.name}</span>
      </div>

      {/* Header Card */}
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Avatar */}
            {app.avatarUrl ? (
              <Image
                src={app.avatarUrl}
                alt={app.name}
                width={80}
                height={80}
                className="rounded-full border-4 border-white shadow-md object-cover"
              />
            ) : (
              <div className="h-20 w-20 bg-white rounded-full flex items-center justify-center text-2xl font-bold text-[#F3CFC6] border-4 border-white shadow-md">
                {app.name[0]?.toUpperCase()}
              </div>
            )}
            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-black">{app.name}</h1>
                <Badge
                  className={`${statusConfig.bgColor} ${statusConfig.color} border-0`}
                >
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {statusConfig.label}
                </Badge>
              </div>
              <p className="text-black/70 mt-1">{statusConfig.description}</p>
            </div>
            {/* Actions */}
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                onClick={() => setApproveDialogOpen(true)}
                disabled={!canApprove || actionLoading}
                className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
              <Button
                onClick={() => setRejectDialogOpen(true)}
                disabled={!canReject || actionLoading}
                variant="destructive"
                className="flex-1 sm:flex-none"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Application Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5" />
              Application Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DetailRow
              icon={<DollarSign className="h-4 w-4" />}
              label="Hourly Rate"
              value={`$${app.rate?.toFixed(2) ?? "0.00"}`}
            />
            <DetailRow
              icon={<MapPin className="h-4 w-4" />}
              label="Service Location"
              value={
                <span className="flex items-center gap-2">
                  {VENUE_ICONS[app.venue]} {VENUE_LABELS[app.venue]}
                </span>
              }
            />
            <DetailRow
              icon={<Calendar className="h-4 w-4" />}
              label="Applied On"
              value={new Date(app.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            />
            {app.submittedAt && (
              <DetailRow
                icon={<Clock className="h-4 w-4" />}
                label="Form Submitted"
                value={new Date(app.submittedAt).toLocaleString()}
              />
            )}
          </CardContent>
        </Card>

        {/* Biography */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5" />
              Biography
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {app.biography || "No biography provided"}
            </p>
          </CardContent>
        </Card>

        {/* Video Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Video className="h-5 w-5" />
              Training Video
            </CardTitle>
          </CardHeader>
          <CardContent>
            {app.video ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Progress</span>
                  <span
                    className={
                      app.video.isCompleted ? "text-green-600 font-medium" : ""
                    }
                  >
                    {app.video.isCompleted
                      ? "Completed ✓"
                      : `${Math.round((app.video.watchedSec / app.video.durationSec) * 100)}%`}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      app.video.isCompleted ? "bg-green-500" : "bg-[#F3CFC6]"
                    }`}
                    style={{
                      width: `${Math.min(100, (app.video.watchedSec / app.video.durationSec) * 100)}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {app.video.watchedSec}s / {app.video.durationSec}s watched
                </p>
                {app.videoWatchedAt && (
                  <p className="text-xs text-muted-foreground">
                    Completed on{" "}
                    {new Date(app.videoWatchedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">Not started yet</p>
            )}
          </CardContent>
        </Card>

        {/* Quiz History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5" />
              Quiz Attempts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {app.quizAttempts.length > 0 ? (
              <div className="space-y-3">
                {app.quizAttempts.map((attempt, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-lg border ${
                      attempt.passed
                        ? "bg-green-50 border-green-200"
                        : "bg-red-50 border-red-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {attempt.passed ? "✓ Passed" : "✗ Failed"}
                      </span>
                      <span className="text-lg font-bold">
                        {attempt.score.toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(attempt.attemptedAt).toLocaleString()}
                    </p>
                    {attempt.nextEligibleAt &&
                      new Date(attempt.nextEligibleAt) > new Date() && (
                        <p className="text-xs text-red-600 mt-1">
                          Retry available in{" "}
                          {formatCooldown(attempt.nextEligibleAt)}
                        </p>
                      )}
                  </div>
                ))}
                {app.quizPassedAt && (
                  <p className="text-xs text-green-600">
                    Quiz passed on{" "}
                    {new Date(app.quizPassedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">No quiz attempts yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Back Button */}
      <Button asChild variant="ghost">
        <Link href="/admin/dashboard/professional-applications">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Applications
        </Link>
      </Button>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Application</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve <strong>{app.name}</strong>
              &apos;s application?
              <br />
              <br />
              This will:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Create a professional profile for them</li>
                <li>Send an approval email notification</li>
                <li>Allow them to receive bookings</li>
              </ul>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setApproveDialogOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleStatusUpdate("APPROVED")}
              disabled={actionLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Application</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject <strong>{app.name}</strong>&apos;s
              application? You may provide a reason that will be included in the
              notification email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">
                Rejection Reason (Optional)
              </Label>
              <Textarea
                id="rejection-reason"
                placeholder="Provide feedback for the applicant..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                This will be included in the rejection email sent to the user.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleStatusUpdate("REJECTED")}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Mail className="h-4 w-4 mr-2" />
              )}
              Reject & Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

// Detail Row Component
function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="text-muted-foreground mt-0.5">{icon}</div>
      <div className="flex-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}

// Skeleton Loader
function DetailSkeleton() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-40 w-full rounded-lg" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
