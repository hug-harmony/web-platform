// app/dashboard/edit-profile/professional-application/status/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  CheckCircle,
  XCircle,
  Clock,
  Video,
  FileText,
  ArrowLeft,
  ArrowRight,
  Trophy,
  AlertCircle,
  RefreshCw,
  Sparkles,
  ClipboardCheck,
  PartyPopper,
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Progress } from "@/components/ui/progress";

type Step =
  | "FORM"
  | "FORM_PENDING"
  | "VIDEO_PENDING"
  | "QUIZ_PENDING"
  | "QUIZ_PASSED"
  | "QUIZ_FAILED"
  | "ADMIN_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "SUSPENDED";

interface StatusData {
  step: Step;
  application: {
    id: string;
    status: Step;
    submittedAt?: string;
    videoWatchedAt?: string;
    quizPassedAt?: string;
    professionalId?: string | null;
  } | null;
  video?: {
    watchedSec: number;
    durationSec: number;
    isCompleted: boolean;
  } | null;
}

interface StepConfig {
  key: Step;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const steps: StepConfig[] = [
  {
    key: "FORM",
    label: "Submit Application",
    description: "Complete the application form with your details",
    icon: <FileText className="h-5 w-5" />,
  },
  {
    key: "VIDEO_PENDING",
    label: "Watch Training Video",
    description: "Learn about our platform and guidelines",
    icon: <Video className="h-5 w-5" />,
  },
  {
    key: "QUIZ_PENDING",
    label: "Pass the Quiz",
    description: "Demonstrate your understanding (80% required)",
    icon: <ClipboardCheck className="h-5 w-5" />,
  },
  {
    key: "ADMIN_REVIEW",
    label: "Admin Review",
    description: "Our team will review your application",
    icon: <Clock className="h-5 w-5" />,
  },
  {
    key: "APPROVED",
    label: "Approved!",
    description: "Welcome to the professional team",
    icon: <Trophy className="h-5 w-5" />,
  },
];

const BASE_PATH = "/dashboard/edit-profile/professional-application";

export default function StatusPage() {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  const fetchStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/professionals/onboarding/status", {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to fetch status");
      }

      const data = await res.json();
      setStatus(data);

      // Redirect if no application exists
      if (!data.application) {
        router.push(BASE_PATH);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login");
    } else if (authStatus === "authenticated") {
      fetchStatus();
    }
  }, [authStatus, router, fetchStatus]);

  // Calculate current step index
  const getCurrentStepIndex = (): number => {
    if (!status?.step) return 0;

    const stepMap: Record<Step, number> = {
      FORM: 0,
      FORM_PENDING: 0,
      VIDEO_PENDING: 1,
      QUIZ_PENDING: 2,
      QUIZ_PASSED: 3,
      QUIZ_FAILED: 2,
      ADMIN_REVIEW: 3,
      APPROVED: 4,
      REJECTED: -1,
      SUSPENDED: -1,
    };

    return stepMap[status.step] ?? 0;
  };

  const currentIndex = getCurrentStepIndex();
  const progressPercentage = Math.min(
    100,
    ((currentIndex + 1) / steps.length) * 100
  );
  const isFailed = status?.step === "QUIZ_FAILED";
  const isRejected = status?.step === "REJECTED";
  const isSuspended = status?.step === "SUSPENDED";
  const isApproved = status?.step === "APPROVED";

  // Loading State
  if (authStatus === "loading" || isLoading) {
    return <StatusSkeleton />;
  }

  // Error State
  if (error) {
    return (
      <motion.div
        className="p-4 max-w-3xl mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchStatus}
              className="ml-4"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </motion.div>
    );
  }

  if (!status) return null;

  return (
    <motion.div
      className="p-4 space-y-6 max-w-3xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="rounded-full bg-white/80 hover:bg-white"
            >
              <Link href={BASE_PATH}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchStatus}
              className="rounded-full"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-2 pb-6">
          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="inline-block"
            >
              {isApproved ? (
                <div className="h-16 w-16 mx-auto bg-green-500 rounded-full flex items-center justify-center mb-4 shadow-lg">
                  <PartyPopper className="h-8 w-8 text-white" />
                </div>
              ) : isRejected || isSuspended ? (
                <div className="h-16 w-16 mx-auto bg-red-500 rounded-full flex items-center justify-center mb-4 shadow-lg">
                  <XCircle className="h-8 w-8 text-white" />
                </div>
              ) : (
                <div className="h-16 w-16 mx-auto bg-white rounded-full flex items-center justify-center mb-4 shadow-lg">
                  <Sparkles className="h-8 w-8 text-[#F3CFC6]" />
                </div>
              )}
            </motion.div>

            <CardTitle className="text-2xl font-bold text-black mb-2">
              {isApproved
                ? "Congratulations! 🎉"
                : isRejected
                  ? "Application Not Approved"
                  : isSuspended
                    ? "Application Suspended"
                    : "Application Status"}
            </CardTitle>

            <p className="text-black/70">
              {isApproved
                ? "You're now a verified professional on our platform!"
                : isRejected
                  ? "Unfortunately, your application was not approved this time."
                  : isSuspended
                    ? "Your application has been suspended."
                    : "Track your progress through the onboarding process"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Progress Overview */}
      {!isRejected && !isSuspended && (
        <Card className="shadow-md">
          <CardContent className="pt-6">
            <div className="space-y-2 mb-6">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Overall Progress</span>
                <span className="font-medium">
                  {currentIndex + 1} of {steps.length} steps
                </span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>

            {/* Steps Timeline */}
            <div className="space-y-1">
              {steps.map((step, i) => {
                const isActive = i === currentIndex;
                const isDone = i < currentIndex;
                const isPending = i > currentIndex;

                return (
                  <motion.div
                    key={step.key}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <div
                      className={`
                        relative flex items-start gap-4 p-4 rounded-xl transition-all
                        ${isActive ? "bg-[#F3CFC6]/20 border-2 border-[#F3CFC6]" : ""}
                        ${isDone ? "bg-green-50" : ""}
                        ${isPending ? "opacity-60" : ""}
                      `}
                    >
                      {/* Connector Line */}
                      {i < steps.length - 1 && (
                        <div
                          className={`
                            absolute left-[29px] top-[52px] w-0.5 h-[calc(100%-20px)]
                            ${isDone ? "bg-green-500" : "bg-gray-200"}
                          `}
                        />
                      )}

                      {/* Step Icon */}
                      <div
                        className={`
                          relative z-10 flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center
                          transition-all duration-300
                          ${isDone ? "bg-green-500 text-white shadow-md" : ""}
                          ${isActive ? "bg-[#F3CFC6] text-black shadow-md ring-4 ring-[#F3CFC6]/30" : ""}
                          ${isPending ? "bg-gray-200 text-gray-500" : ""}
                        `}
                      >
                        {isDone ? (
                          <CheckCircle className="h-5 w-5" />
                        ) : (
                          step.icon
                        )}
                      </div>

                      {/* Step Content */}
                      <div className="flex-1 min-w-0 pt-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p
                            className={`
                              font-semibold
                              ${isDone ? "text-green-700" : ""}
                              ${isActive ? "text-black" : ""}
                              ${isPending ? "text-gray-500" : ""}
                            `}
                          >
                            {step.label}
                          </p>

                          {isDone && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                              Completed
                            </span>
                          )}

                          {isActive && !isFailed && (
                            <span className="text-xs bg-[#F3CFC6] text-black px-2 py-0.5 rounded-full animate-pulse">
                              Current Step
                            </span>
                          )}

                          {isActive && isFailed && (
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                              Retry Available
                            </span>
                          )}
                        </div>

                        <p className="text-sm text-muted-foreground mt-0.5">
                          {step.description}
                        </p>

                        {/* Action Buttons */}
                        {isActive && (
                          <div className="mt-3">
                            {status.step === "VIDEO_PENDING" && (
                              <Button
                                asChild
                                size="sm"
                                className="bg-[#F3CFC6] hover:bg-[#e5b8ad] text-black rounded-full"
                              >
                                <Link href={`${BASE_PATH}/video`}>
                                  Watch Video
                                  <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                              </Button>
                            )}

                            {(status.step === "QUIZ_PENDING" ||
                              status.step === "QUIZ_FAILED") && (
                              <Button
                                asChild
                                size="sm"
                                className="bg-[#F3CFC6] hover:bg-[#e5b8ad] text-black rounded-full"
                              >
                                <Link href={`${BASE_PATH}/quiz`}>
                                  {status.step === "QUIZ_FAILED"
                                    ? "Retry Quiz"
                                    : "Take Quiz"}
                                  <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                              </Button>
                            )}

                            {status.step === "ADMIN_REVIEW" && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock className="h-4 w-4 animate-pulse" />
                                <span>We&apos;ll notify you once reviewed</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Timestamps */}
                        {isDone && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            {i === 0 && status.application?.submittedAt && (
                              <span>
                                Submitted on{" "}
                                {new Date(
                                  status.application.submittedAt
                                ).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </span>
                            )}
                            {i === 1 && status.application?.videoWatchedAt && (
                              <span>
                                Completed on{" "}
                                {new Date(
                                  status.application.videoWatchedAt
                                ).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </span>
                            )}
                            {i === 2 && status.application?.quizPassedAt && (
                              <span>
                                Passed on{" "}
                                {new Date(
                                  status.application.quizPassedAt
                                ).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Failed Quiz Alert */}
      {isFailed && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Alert className="border-amber-500 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800">Quiz Not Passed</AlertTitle>
            <AlertDescription className="text-amber-700">
              Don&apos;t worry! You can retry the quiz after a 24-hour cooldown
              period. Use this time to review the training video.
              <div className="mt-3 flex gap-2">
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                >
                  <Link href={`${BASE_PATH}/video`}>
                    <Video className="mr-2 h-4 w-4" />
                    Rewatch Video
                  </Link>
                </Button>
                <Button
                  asChild
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 text-white rounded-full"
                >
                  <Link href={`${BASE_PATH}/quiz/cooldown`}>
                    Check Cooldown
                  </Link>
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </motion.div>
      )}

      {/* Rejected Alert */}
      {isRejected && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-red-800 mb-1">
                    Application Rejected
                  </h3>
                  <p className="text-sm text-red-700 mb-4">
                    We&apos;re sorry, but your application was not approved at
                    this time. If you believe this was a mistake or would like
                    more information, please contact our support team.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="rounded-full border-red-300 text-red-700 hover:bg-red-100"
                    >
                      <Link href="/support">Contact Support</Link>
                    </Button>
                    <Button
                      asChild
                      size="sm"
                      className="bg-red-600 hover:bg-red-700 text-white rounded-full"
                    >
                      <Link href={BASE_PATH}>Apply Again</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Suspended Alert */}
      {isSuspended && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-red-800 mb-1">
                    Application Suspended
                  </h3>
                  <p className="text-sm text-red-700 mb-4">
                    Your application has been suspended. Please contact our
                    support team for more information about this decision.
                  </p>
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="rounded-full border-red-300 text-red-700 hover:bg-red-100"
                  >
                    <Link href="/support">Contact Support</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Approved Success Card */}
      {isApproved && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg">
            <CardContent className="pt-6">
              <div className="text-center">
                <motion.div
                  initial={{ rotate: -10 }}
                  animate={{ rotate: [0, -10, 10, -10, 0] }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="inline-block"
                >
                  <Trophy className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
                </motion.div>
                <h3 className="text-xl font-bold text-green-800 mb-2">
                  Welcome to the Team!
                </h3>
                <p className="text-green-700 mb-6 max-w-md mx-auto">
                  Your professional profile is now active. You can start
                  receiving bookings and connecting with clients right away!
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    asChild
                    className="bg-green-600 hover:bg-green-700 text-white rounded-full"
                  >
                    <Link href="/dashboard">
                      Go to Dashboard
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="rounded-full border-green-300 text-green-700 hover:bg-green-100"
                  >
                    <Link href={`/dashboard/edit-profile/${session?.user?.id}`}>
                      Edit My Profile
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Video Progress (if applicable) */}
      {status.video && !status.video.isCompleted && !isApproved && (
        <Card className="shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Video className="h-4 w-4" />
              Video Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Watched</span>
                <span className="font-medium">
                  {Math.round(
                    (status.video.watchedSec / status.video.durationSec) * 100
                  )}
                  %
                </span>
              </div>
              <Progress
                value={
                  (status.video.watchedSec / status.video.durationSec) * 100
                }
                className="h-2"
              />
              <p className="text-xs text-muted-foreground">
                {Math.floor(status.video.watchedSec / 60)}m{" "}
                {status.video.watchedSec % 60}s of{" "}
                {Math.floor(status.video.durationSec / 60)}m{" "}
                {status.video.durationSec % 60}s
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Back to Dashboard */}
      <Button
        asChild
        variant="outline"
        className="w-full rounded-full"
        size="lg"
      >
        <Link href="/dashboard">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>
      </Button>
    </motion.div>
  );
}

// Skeleton Loader
function StatusSkeleton() {
  return (
    <div className="p-4 space-y-6 max-w-3xl mx-auto">
      {/* Header Skeleton */}
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4]">
        <CardHeader className="pb-2">
          <div className="flex justify-between">
            <Skeleton className="h-9 w-24 rounded-full" />
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </CardHeader>
        <CardContent className="pt-2 pb-6">
          <div className="text-center space-y-4">
            <Skeleton className="h-16 w-16 rounded-full mx-auto" />
            <Skeleton className="h-8 w-48 mx-auto" />
            <Skeleton className="h-4 w-64 mx-auto" />
          </div>
        </CardContent>
      </Card>

      {/* Progress Skeleton */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2 mb-6">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>

          {/* Steps Skeleton */}
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-start gap-4 p-4">
                <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-64" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Skeleton className="h-12 w-full rounded-full" />
    </div>
  );
}
