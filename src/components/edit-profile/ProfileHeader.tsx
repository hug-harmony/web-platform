// src/components/profile/ProfileHeader.tsx
"use client";

import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Verified, Star } from "lucide-react";
import { HeaderActionButtons } from "./HeaderActionButtons";

interface Props {
  profile: {
    name?: string | null;
    email: string;
    profileImage?: string | null;
  };
  isProfessional: boolean;
  ownProfile: boolean;
  onboardingStep?: string;
  professionalId?: string | null;
  // Optional: add these if available
  rating?: number | null;
  reviewCount?: number | null;
  isVerified?: boolean;
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export function ProfileHeader({
  profile,
  isProfessional,
  ownProfile,
  onboardingStep,
  professionalId,
  rating,
  reviewCount,
  isVerified,
}: Props) {
  const initials =
    profile.name
      ?.split(" ")
      .map((n) => n.charAt(0))
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  return (
    <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
      <CardHeader className="pb-2">
        <motion.div variants={itemVariants} initial="hidden" animate="visible">
          <div className="flex items-center justify-between">
            {/* Left: Avatar + Info */}
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 border-4 border-white shadow-lg">
                <AvatarImage
                  src={profile.profileImage || "/register.jpg"}
                  alt={profile.name ?? "User"}
                  className="object-cover"
                />
                <AvatarFallback className="bg-gradient-to-br from-[#F3CFC6] to-[#C4C4C4] text-white text-xl font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-black">
                    {profile.name ?? "User"}
                  </h1>
                  {isVerified && (
                    <Verified className="h-5 w-5 text-blue-500 fill-blue-500" />
                  )}
                </div>

                <p className="text-sm text-black/70">{profile.email}</p>

                <div className="flex items-center gap-2 mt-2">
                  {isProfessional && (
                    <Badge className="bg-black text-[#F3CFC6] hover:bg-black/90">
                      <Star className="h-3 w-3 mr-1 fill-current" />
                      Professional
                    </Badge>
                  )}

                  {rating && reviewCount && reviewCount > 0 && (
                    <Badge
                      variant="secondary"
                      className="bg-white/80 text-gray-700"
                    >
                      <Star className="h-3 w-3 mr-1 text-yellow-500 fill-yellow-500" />
                      {rating.toFixed(1)} ({reviewCount})
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Quick Stats (Optional - only if viewing own profile) */}
            {ownProfile && (
              <div className="hidden md:flex items-center gap-3">
                {isProfessional && (
                  <div className="bg-white/80 rounded-lg px-4 py-2 text-center">
                    <p className="text-lg font-bold text-black">
                      {onboardingStep === "APPROVED" ? "Active" : "Pending"}
                    </p>
                    <p className="text-xs text-gray-600">Status</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </CardHeader>

      <CardContent className="pt-2">
        <HeaderActionButtons
          ownProfile={ownProfile}
          onboardingStep={onboardingStep}
          professionalId={professionalId}
        />
      </CardContent>
    </Card>
  );
}
