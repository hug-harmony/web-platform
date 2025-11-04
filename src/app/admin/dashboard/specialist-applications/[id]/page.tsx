/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  FileText,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Video,
  MapPin,
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
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
  avatarUrl?: string | null;
  biography: string; // <-- from User
  rate: number;
  venue: "host" | "visit"; // <-- new
  status: ProStatus;
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

export default function ApplicationDetailPage() {
  const { id } = useParams();
  const [app, setApp] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchApp = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/specialists/application?admin=true&id=${id}`,
        { credentials: "include" }
      );
      if (!res.ok) {
        const err = await res.json();
        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }
        throw new Error(err.error ?? "Failed");
      }
      const data: Application = await res.json();
      setApp(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApp();
  }, [id]);

  const updateStatus = async (status: "APPROVED" | "REJECTED") => {
    try {
      const res = await fetch("/api/specialists/application", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
        credentials: "include",
      });

      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");

      await fetchApp(); // refresh
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (loading) return <SkeletonDetail />;
  if (error) return <p className="p-4 text-center text-red-500">{error}</p>;
  if (!app) return <p className="p-4 text-center">Not found.</p>;

  const canApprove = app.status === "ADMIN_REVIEW";
  const canReject = !["APPROVED", "REJECTED"].includes(app.status);

  return (
    <motion.div
      className="space-y-6 max-w-7xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Breadcrumb />

      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] text-black dark:text-white shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-white">
              {app.avatarUrl ? (
                <Image
                  src={app.avatarUrl}
                  alt={app.name}
                  width={100}
                  height={100}
                  className="h-full w-full object-cover rounded-full"
                />
              ) : (
                <AvatarFallback className="bg-[#C4C4C4] text-black">
                  {app.name[0]}
                </AvatarFallback>
              )}
            </Avatar>
            <div>
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <FileText className="h-6 w-6" />
                {app.name}
              </CardTitle>
              <p className="text-sm opacity-80">Professional Application</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Core Info */}
          <Section title="Biography">{app.biography || "—"}</Section>

          <Section title="Rate">${app.rate.toFixed(2)} / session</Section>

          <Section title="Venue">
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {app.venue === "host"
                ? "I host at my location"
                : "I visit the client"}
            </span>
          </Section>

          <Section title="Submitted">
            {app.submittedAt ? new Date(app.submittedAt).toLocaleString() : "—"}
          </Section>

          {/* Video */}
          {app.video && (
            <Section title="Training Video">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4" />
                {app.video.isCompleted ? (
                  <span className="text-green-500">Completed</span>
                ) : (
                  <span>
                    {app.video.watchedSec}s / {app.video.durationSec}s
                  </span>
                )}
              </div>
            </Section>
          )}

          {/* Quiz History */}
          {app.quizAttempts.length > 0 && (
            <Section title="Quiz Attempts">
              <div className="space-y-2">
                {app.quizAttempts.map((a, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>
                      {new Date(a.attemptedAt).toLocaleDateString()} –{" "}
                      <strong>{a.score.toFixed(0)}%</strong>
                      {a.passed ? " (Passed)" : " (Failed)"}
                    </span>
                    {a.nextEligibleAt && (
                      <span className="text-red-500">
                        retry in {formatCooldown(a.nextEligibleAt)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Current Status */}
          <Section title="Current Status">
            <span
              className={`flex items-center gap-1 ${statusColors[app.status]}`}
            >
              {statusIcons[app.status]}
              {app.status.replace(/_/g, " ")}
            </span>
          </Section>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={() => updateStatus("APPROVED")}
              disabled={!canApprove}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CheckCircle className="mr-1 h-4 w-4" />
              Approve
            </Button>
            <Button
              onClick={() => updateStatus("REJECTED")}
              disabled={!canReject}
              variant="destructive"
            >
              <XCircle className="mr-1 h-4 w-4" />
              Reject
            </Button>
          </div>
        </CardContent>
      </Card>

      <Button asChild variant="link" className="text-[#F3CFC6]">
        <Link href="/admin/dashboard/specialist-applications">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Link>
      </Button>
    </motion.div>
  );
}

/** Helpers */
function Breadcrumb() {
  return (
    <div className="flex items-center gap-2 text-sm text-[#C4C4C4]">
      <Link
        href="/admin/dashboard/specialist-applications"
        className="hover:text-[#F3CFC6]"
      >
        Professional Applications
      </Link>
      <span>/</span>
      <span>Detail</span>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="font-medium text-black dark:text-white">{title}:</p>
      <div className="mt-1 text-sm text-[#333] dark:text-[#ddd]">
        {children}
      </div>
    </div>
  );
}

function formatCooldown(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  const hrs = Math.floor(ms / 36e5);
  const mins = Math.floor((ms % 36e5) / 6e4);
  return `${hrs}h ${mins}m`;
}

function SkeletonDetail() {
  return (
    <div className="space-y-4 p-4">
      <div className="h-20 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
      <div className="h-64 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
    </div>
  );
}
