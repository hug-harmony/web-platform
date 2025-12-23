// src/components/dashboard/QuickActions.tsx
"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, MessageSquare } from "lucide-react";

const actions = [
  {
    href: "/dashboard/payment",
    label: "View Payments",
    icon: <DollarSign className="h-8 w-8 text-[#F3CFC6]" />,
    description: "Check your payment history.",
  },
  {
    href: "/dashboard/notes",
    label: "Notes & Journal",
    icon: <MessageSquare className="h-8 w-8 text-[#F3CFC6]" />,
    description: "Review your session notes.",
  },
];

export function QuickActions() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {actions.map((item) => (
        <motion.div
          key={item.href}
          whileHover={{
            scale: 1.05,
            boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
          }}
          transition={{ duration: 0.2 }}
        >
          <Link href={item.href}>
            <Card className="hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20 transition-colors shadow-lg">
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
