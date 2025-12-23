import { Button } from "@/components/ui/button";
import { Gem } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import PushNotificationManager from "../PushNotificationManager";

interface Props {
  ownProfile: boolean;
  onboardingStep?: string;
  professionalId?: string | null;
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function HeaderActionButtons({
  ownProfile,
  onboardingStep,
  professionalId,
}: Props) {
  const router = useRouter();

  if (!ownProfile) return null;

  if (onboardingStep === "APPROVED" && professionalId) {
    return (
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <motion.div variants={itemVariants} whileHover={{ scale: 1.05 }}>
            <Button
              variant="outline"
              onClick={() =>
                router.push(
                  `/dashboard/discounts?professionalId=${professionalId}`
                )
              }
              className="text-[#F3CFC6] border-[#F3CFC6] hover:bg-white dark:hover:bg-white rounded-full"
            >
              Manage Discounts
            </Button>
          </motion.div>
          <motion.div variants={itemVariants} whileHover={{ scale: 1.05 }}>
            <Button
              variant="outline"
              onClick={() =>
                router.push(
                  `/dashboard/availability?professionalId=${professionalId}`
                )
              }
              className="text-[#F3CFC6] border-[#F3CFC6] hover:bg-white dark:hover:bg-white rounded-full"
            >
              Manage Availability
            </Button>
          </motion.div>
        </div>
        <PushNotificationManager />
      </div>
    );
  }

  return (
    <motion.div variants={itemVariants} whileHover={{ scale: 1.05 }}>
      <Button
        variant="outline"
        onClick={() =>
          router.push("/dashboard/profile/professional-application/status")
        }
        className="text-[#F3CFC6] border-[#F3CFC6] hover:bg-white dark:hover:bg-white rounded-full flex items-center gap-2"
      >
        <Gem className="w-4 h-4 text-[#F3CFC6]" />
        My Application Status
      </Button>
    </motion.div>
  );
}
