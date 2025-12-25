// app/dashboard/edit-profile/professional-application/quiz/cooldown/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function CooldownPage() {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { status } = useSession();
  const router = useRouter();

  const checkCooldown = useCallback(async () => {
    try {
      const res = await fetch("/api/professionals/onboarding/quiz/cooldown", {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to check cooldown");
      }

      const data = await res.json();

      if (data.eligible) {
        router.push("/dashboard/edit-profile/professional-application/quiz");
      } else {
        setSecondsLeft(data.secondsLeft);
      }
    } catch (error) {
      console.error("Cooldown check error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      checkCooldown();
    }
  }, [status, router, checkCooldown]);

  // Countdown timer
  useEffect(() => {
    if (secondsLeft === null || secondsLeft <= 0) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          router.push("/dashboard/edit-profile/professional-application/quiz");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsLeft, router]);

  const formatTime = (sec: number): string => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Loading state
  if (status === "loading" || isLoading) {
    return (
      <div className="p-4 max-w-xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader>
            <Skeleton className="h-8 w-48 mx-auto" />
          </CardHeader>
          <CardContent className="space-y-6">
            <Skeleton className="h-24 w-48 mx-auto" />
            <Skeleton className="h-4 w-64 mx-auto" />
            <Skeleton className="h-10 w-full rounded-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <motion.div
      className="p-4 space-y-6 max-w-xl mx-auto"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-2 items-start justify-between">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="rounded-full"
            >
              <Link href="/dashboard/edit-profile/professional-application/status">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Status
              </Link>
            </Button>
            <CardTitle className="text-xl text-black flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Quiz Cooldown
            </CardTitle>
            <div className="w-20" />
          </div>
        </CardHeader>
      </Card>

      {/* Countdown Card */}
      <Card className="shadow-lg">
        <CardContent className="py-10 space-y-6 text-center">
          {/* Timer Display */}
          <motion.div
            className="text-6xl md:text-7xl font-bold text-red-500 font-mono"
            key={secondsLeft}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            {secondsLeft !== null ? formatTime(secondsLeft) : "--:--:--"}
          </motion.div>

          {/* Message */}
          <div className="space-y-2">
            <p className="text-lg font-medium">
              You must wait before retaking the quiz
            </p>
            <p className="text-muted-foreground">
              The 24-hour cooldown helps ensure you have time to review the
              training materials before trying again.
            </p>
          </div>

          {/* Tips */}
          <div className="bg-gray-50 rounded-lg p-4 text-left space-y-2">
            <p className="font-medium text-sm">While you wait, you can:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Rewatch the onboarding video</li>
              <li>• Review the platform guidelines</li>
              <li>• Update your profile information</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button asChild variant="outline" className="flex-1 rounded-full">
              <Link href="/dashboard/edit-profile/professional-application/video">
                <RefreshCw className="mr-2 h-4 w-4" />
                Rewatch Video
              </Link>
            </Button>
            <Button
              asChild
              className="flex-1 bg-[#F3CFC6] hover:bg-[#e5b8ad] text-black rounded-full"
            >
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
