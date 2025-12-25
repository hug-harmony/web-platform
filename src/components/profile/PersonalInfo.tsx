// src/app/dashboard/profile/[id]/PersonalInfo.tsx

import React from "react";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { Profile } from "@/types/profile";

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

function InfoItem({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="font-medium text-black dark:text-white">{label}</p>
      <p className="text-[#C4C4C4]">{value || "Not specified"}</p>
    </div>
  );
}

interface PersonalInfoProps {
  profile: Profile;
}

export default function PersonalInfo({ profile }: PersonalInfoProps) {
  return (
    <motion.div variants={itemVariants}>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-black dark:text-white">
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm sm:text-base">
            <InfoItem
              label="Relationship Status"
              value={profile.relationshipStatus}
            />
            <InfoItem label="Orientation" value={profile.orientation} />
            <InfoItem label="Height" value={profile.height} />
            <InfoItem label="Ethnicity" value={profile.ethnicity} />
            <InfoItem label="Zodiac Sign" value={profile.zodiacSign} />
            <InfoItem label="Favorite Color" value={profile.favoriteColor} />
            <InfoItem
              label="Favorite Movie/TV Show"
              value={profile.favoriteMedia}
            />
            <InfoItem label="Pet Ownership" value={profile.petOwnership} />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
