// src/components/dashboard/ActionTiles.tsx
"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { UserStar, UserRoundSearch, Video } from "lucide-react";

const tiles = [
  {
    href: "/dashboard/professionals",
    label: "Find a Professional",
    icon: <UserStar className="h-8 w-8 text-[#F3CFC6]" />,
    description: "Connect with certified professionals.",
  },
  {
    href: "/dashboard/appointments",
    label: "Appointment Calendar",
    icon: <UserRoundSearch className="h-8 w-8 text-[#F3CFC6]" />,
    description: "Manage your bookings and schedule.",
  },
  {
    href: "/dashboard/forum",
    label: "Forum Discussions",
    icon: <Video className="h-8 w-8 text-[#F3CFC6]" />,
    description: "Join community conversations.",
  },
];

export function ActionTiles() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {tiles.map((item) => (
        <motion.div
          key={item.href}
          whileHover={{
            scale: 1.05,
            boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
          }}
          transition={{ duration: 0.2 }}
        >
          <Link href={item.href}>
            <Card className="hover:bg-[#fff]/80 dark:hover:bg-[#C4C4C4]/20 transition-colors">
              <CardContent className="flex items-center space-x-4 p-6">
                {item.icon}
                <div>
                  <h3 className="text-lg font-semibold text-black dark:text-white">
                    {item.label}
                  </h3>
                  <p className="text-sm text-[#C4C4C4]">{item.description}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
