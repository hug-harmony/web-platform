// src/app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useDashboardData } from "@/hooks/dashboard/useDashboardData";
import {
  DashboardSkeleton,
  WelcomeHero,
  ActionTiles,
  RecentMessages,
  AppointmentsSection,
  QuickActions,
} from "@/components/dashboard";
import HowDidYouHearDialog from "@/components/HowDidYouHearDialog";
import { toast } from "sonner";

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, staggerChildren: 0.2 },
  },
};

export default function DashboardPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const { user, conversations, appointments, loading, error } =
    useDashboardData();
  const [dialogOpen, setDialogOpen] = useState(false);

  // Show survey dialog if user hasn't answered
  useEffect(() => {
    if (!loading && user && !user.heardFrom) {
      setDialogOpen(true);
    }
  }, [loading, user]);

  const handleSurveySubmit = async (data: {
    heardFrom: string;
    heardFromOther?: string;
  }) => {
    try {
      const res = await fetch("/api/users/update-hear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Failed to save");

      await update({
        ...session,
        user: {
          ...session?.user,
          heardFrom: data.heardFrom,
          heardFromOther: data.heardFromOther,
        },
      });

      toast.success("Thanks for letting us know!");
    } catch {
      toast.error("Failed to save response");
      throw new Error("save failed");
    }
  };

  // Loading state
  if (loading) {
    return <DashboardSkeleton />;
  }

  // Unauthenticated
  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  // Error state
  if (error || !user) {
    return (
      <div className="text-center p-6 text-red-500">
        {error || "User data not found."}
      </div>
    );
  }

  return (
    <motion.div
      className="p-4 space-y-6 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <WelcomeHero user={user} />

      <ActionTiles />

      <RecentMessages conversations={conversations} currentUserId={user.id} />

      <AppointmentsSection appointments={appointments} />

      <QuickActions />

      <HowDidYouHearDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSurveySubmit}
      />
    </motion.div>
  );
}
