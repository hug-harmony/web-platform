"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function CooldownPage() {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated") checkCooldown();
  }, [status, router]);

  const checkCooldown = async () => {
    const res = await fetch("/api/professionals/onboarding/quiz/cooldown", {
      credentials: "include",
    });
    const data = await res.json();
    if (data.eligible) {
      router.push("/dashboard/profile/professional-application/quiz");
    } else {
      setSecondsLeft(data.secondsLeft);
      const timer = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            router.push("/dashboard/profile/professional-application/quiz");
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  };

  const formatTime = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (status === "loading")
    return (
      <div className="p-4">
        <Card>
          <CardContent>
            <p className="py-8 text-center">Checking...</p>
          </CardContent>
        </Card>
      </div>
    );

  return (
    <motion.div
      className="p-4 space-y-6 max-w-7xl mx-auto"
      initial={{ scale: 0.9 }}
      animate={{ scale: 1 }}
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" /> Quiz Cooldown
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <div className="text-6xl font-bold text-red-500">
            {formatTime(secondsLeft)}
          </div>
          <p className="text-muted-foreground">
            You must wait 24 hours before retaking the quiz.
          </p>
          <Button asChild className="w-full rounded-full">
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
