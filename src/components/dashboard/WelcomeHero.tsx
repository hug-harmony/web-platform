// src/components/dashboard/WelcomeHero.tsx
"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { DashboardUser } from "@/types/dashboard";

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

interface WelcomeHeroProps {
  user: DashboardUser;
}

export function WelcomeHero({ user }: WelcomeHeroProps) {
  return (
    <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] text-black dark:text-white shadow-lg">
      <CardHeader>
        <motion.div
          variants={itemVariants}
          className="flex items-center space-x-4"
        >
          <Link href={`/dashboard/edit-profile/${user.id}`}>
            <Avatar className="h-16 w-16 border-2 border-white cursor-pointer hover:opacity-80 transition-opacity">
              <AvatarImage src={user.profileImage} alt={user.name} />
              <AvatarFallback className="bg-[#C4C4C4] text-black">
                {user.name?.[0]?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div>
            <CardTitle className="text-2xl font-bold">
              Welcome back, {user.firstName || user.name}!
            </CardTitle>
            <p className="text-sm opacity-80">
              Manage your wellness journey with ease.
            </p>
          </div>
        </motion.div>
      </CardHeader>
    </Card>
  );
}
