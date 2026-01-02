// src/components/profile/HeaderActionButtons.tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  Gem,
  CalendarCog,
  Percent,
  Settings,
  ChevronRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import PushNotificationManager from "../PushNotificationManager";

interface Props {
  ownProfile: boolean;
  onboardingStep?: string;
  professionalId?: string | null;
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { staggerChildren: 0.1 } },
};

const buttonVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0 },
};

export function HeaderActionButtons({
  ownProfile,
  onboardingStep,
  professionalId,
}: Props) {
  const router = useRouter();

  if (!ownProfile) return null;

  // Approved Professional Actions
  if (onboardingStep === "APPROVED" && professionalId) {
    return (
      <motion.div
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
        variants={itemVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="flex flex-wrap gap-2">
          <motion.div variants={buttonVariants} whileHover={{ scale: 1.02 }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                router.push(
                  `/dashboard/discounts?professionalId=${professionalId}`
                )
              }
              className="bg-white/80 hover:bg-white border-0 text-gray-800 rounded-full shadow-sm"
            >
              <Percent className="h-4 w-4 mr-2 text-[#F3CFC6]" />
              Manage Discounts
              <ChevronRight className="h-4 w-4 ml-1 opacity-50" />
            </Button>
          </motion.div>

          <motion.div variants={buttonVariants} whileHover={{ scale: 1.02 }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                router.push(
                  `/dashboard/availability?professionalId=${professionalId}`
                )
              }
              className="bg-white/80 hover:bg-white border-0 text-gray-800 rounded-full shadow-sm"
            >
              <CalendarCog className="h-4 w-4 mr-2 text-[#F3CFC6]" />
              Manage Availability
              <ChevronRight className="h-4 w-4 ml-1 opacity-50" />
            </Button>
          </motion.div>

          {/* <motion.div variants={buttonVariants} whileHover={{ scale: 1.02 }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/dashboard/settings")}
              className="bg-white/80 hover:bg-white border-0 text-gray-800 rounded-full shadow-sm"
            >
              <Settings className="h-4 w-4 mr-2 text-[#F3CFC6]" />
              Settings
            </Button>
          </motion.div> */}
        </div>

        <PushNotificationManager />
      </motion.div>
    );
  }

  // Non-Professional or Pending Application
  return (
    <motion.div
      className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
      variants={itemVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={buttonVariants} whileHover={{ scale: 1.02 }}>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            router.push("/dashboard/edit-profile/professional-application")
          }
          className="bg-white/80 hover:bg-white border-0 text-gray-800 rounded-full shadow-sm"
        >
          <Gem className="h-4 w-4 mr-2 text-[#F3CFC6]" />
          My Application Status
          <ChevronRight className="h-4 w-4 ml-1 opacity-50" />
        </Button>
      </motion.div>

      <PushNotificationManager />
    </motion.div>
  );
}
