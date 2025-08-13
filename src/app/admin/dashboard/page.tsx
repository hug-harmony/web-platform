"use client";

import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  BarChart,
  Flag,
} from "lucide-react";
import Link from "next/link";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
}

export default function AdminDashboardPage() {
  const { data: session } = useSession();

  const admin: AdminUser = {
    id: session?.user?.id || "admin_1",
    name: session?.user?.name || "Admin",
    email: session?.user?.email || "admin@example.com",
    avatar: session?.user?.image || "/assets/images/avatar-placeholder.png",
  };

  const dashboardItems = [
    {
      href: "/admin/dashboard/users",
      label: "Users",
      icon: <Users className="h-8 w-8 text-[#F3CFC6]" />,
      description: "Manage registered users and their profiles.",
    },
    {
      href: "/admin/dashboard/specialists",
      label: "Professionals",
      icon: <UserCheck className="h-8 w-8 text-[#F3CFC6]" />,
      description: "View and edit specialist details.",
    },
    {
      href: "/admin/dashboard/specialist-applications",
      label: "Applications",
      icon: <UserCheck className="h-8 w-8 text-[#F3CFC6]" />,
      description: "Review specialist applications.",
    },
    {
      href: "/admin/dashboard/stats",
      label: "App Stats",
      icon: <BarChart className="h-8 w-8 text-[#F3CFC6]" />,
      description: "Analyze application metrics and trends.",
    },
    {
      href: "/admin/dashboard/reports",
      label: "Reports",
      icon: <Flag className="h-8 w-8 text-[#F3CFC6]" />,
      description: "View user-submitted reports and issues.",
    },
  ];

  return (
    <motion.div
      className="space-y-6 w-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Welcome Section */}
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] text-black dark:text-white shadow-lg">
        <CardHeader>
          <motion.div
            className="flex items-center space-x-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Avatar className="h-16 w-16 border-2 border-white">
              <AvatarImage src={admin.avatar} alt={admin.name} />
              <AvatarFallback className="bg-[#C4C4C4] text-black">
                {admin.name[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-2xl font-bold">
                Welcome to Hug Harmony, {admin.name}
              </CardTitle>
              <p className="text-sm opacity-80">
                Manage your application resources with ease.
              </p>
            </div>
          </motion.div>
        </CardHeader>
      </Card>

      {/* Dashboard Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dashboardItems.map((item) => (
          <motion.div
            key={item.href}
            whileHover={{
              scale: 1.05,
              boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
            }}
            transition={{ duration: 0.2 }}
          >
            <Link href={item.href}>
              <Card className="hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20 transition-colors">
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
    </motion.div>
  );
}
