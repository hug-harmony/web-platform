// src/app/dashboard/profile/[id]/AboutSection.tsx

import React from "react";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { Profile, ProfessionalProfile } from "@/types/profile";

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

// Type guard
function isProfessional(profile: Profile): profile is ProfessionalProfile {
  return profile.type === "professional";
}

interface AboutSectionProps {
  profile: Profile;
}

export default function AboutSection({ profile }: AboutSectionProps) {
  if (!profile.biography) return null;

  const isPro = isProfessional(profile);

  return (
    <motion.div variants={itemVariants}>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-black dark:text-white">
            About {isPro ? "the Professional" : profile.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <h4 className="text-lg font-semibold text-black dark:text-white">
              Bio
            </h4>
            <p className="text-sm sm:text-base text-black dark:text-white leading-relaxed">
              {profile.biography}
            </p>
          </div>
          {isPro && profile.venue && (
            <div className="space-y-2">
              <h4 className="text-lg font-semibold text-black dark:text-white">
                Venue Preference
              </h4>
              <p className="text-sm sm:text-base text-black dark:text-white">
                {profile.venue.charAt(0).toUpperCase() + profile.venue.slice(1)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
