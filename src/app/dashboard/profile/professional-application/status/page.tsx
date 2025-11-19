"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Clock, Video, FileText } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type Step =
  | "FORM"
  | "VIDEO_PENDING"
  | "QUIZ_PENDING"
  | "QUIZ_PASSED"
  | "QUIZ_FAILED"
  | "ADMIN_REVIEW"
  | "APPROVED"
  | "REJECTED";

interface StatusData {
  step: Step;
  application: {
    status: Step;
    submittedAt?: string;
    videoWatchedAt?: string;
    quizPassedAt?: string;
  };
  video?: { watchedSec: number; durationSec: number; isCompleted: boolean };
}

const steps: { key: Step; label: string; icon: React.ReactNode }[] = [
  {
    key: "FORM",
    label: "Submit Application",
    icon: <FileText className="h-5 w-5" />,
  },
  {
    key: "VIDEO_PENDING",
    label: "Watch Video",
    icon: <Video className="h-5 w-5" />,
  },
  {
    key: "QUIZ_PENDING",
    label: "Take Quiz",
    icon: <Clock className="h-5 w-5" />,
  },
  {
    key: "ADMIN_REVIEW",
    label: "Admin Review",
    icon: <Clock className="h-5 w-5" />,
  },
  {
    key: "APPROVED",
    label: "Approved!",
    icon: <CheckCircle className="h-5 w-5" />,
  },
];

export default function StatusPage() {
  const [status, setStatus] = useState<StatusData | null>(null);
  const { status: authStatus } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (authStatus === "unauthenticated") router.push("/login");
    if (authStatus === "authenticated") fetchStatus();
  }, [authStatus, router]);

  const fetchStatus = async () => {
    const res = await fetch("/api/professionals/onboarding/status", {
      credentials: "include",
    });
    const data = await res.json();
    setStatus(data);
    if (!data.application)
      router.push("/dashboard/profile/professional-application");
  };

  if (authStatus === "loading" || !status)
    return (
      <div className="p-4">
        <Card>
          <CardContent>
            <p className="py-8 text-center">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );

  const currentIndex = steps.findIndex(
    (s) => s.key === status.step?.toUpperCase()
  );
  const isFailed = ["QUIZ_FAILED", "REJECTED"].includes(status.step);

  return (
    <motion.div
      className="p-4 space-y-6 max-w-7xl mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <Card>
        <CardHeader>
          <CardTitle>Your Application Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            {steps.map((step, i) => {
              const isActive = i === currentIndex;
              const isDone = i < currentIndex;
              // const isPending = i > currentIndex;

              return (
                <div key={step.key} className="flex items-center gap-3">
                  <div
                    className={`rounded-full p-2 ${isDone ? "bg-green-500" : isActive ? "bg-[#F3CFC6]" : "bg-gray-300"} text-white`}
                  >
                    {isDone ? <CheckCircle className="h-4 w-4" /> : step.icon}
                  </div>
                  <div className="flex-1">
                    <p
                      className={`font-medium ${isDone ? "text-green-600" : isActive ? "text-black" : "text-muted-foreground"}`}
                    >
                      {step.label}
                    </p>
                    {isActive && status.step === "VIDEO_PENDING" && (
                      <Button asChild size="sm" className="mt-1">
                        <Link href="/dashboard/profile/professional-application/video">
                          Continue
                        </Link>
                      </Button>
                    )}
                    {isActive && status.step === "QUIZ_PENDING" && (
                      <Button asChild size="sm" className="mt-1">
                        <Link href="/dashboard/profile/professional-application/quiz">
                          Take Quiz
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {isFailed && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              <p className="font-medium flex items-center gap-2">
                <XCircle className="h-5 w-5" /> Application{" "}
                {status.step === "REJECTED" ? "Rejected" : "Failed Quiz"}
              </p>
              <p className="text-sm mt-1">
                {status.step === "QUIZ_FAILED"
                  ? "You may retry after 24 hours."
                  : "Contact support for details."}
              </p>
            </div>
          )}

          <Button asChild className="w-full rounded-full">
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
