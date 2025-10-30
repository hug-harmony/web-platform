/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { motion, easeInOut } from "framer-motion";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  LogOut,
  Menu,
  Moon,
  Sun,
  LayoutDashboard,
  Users,
  UserCheck,
  BarChart,
  Flag,
  Calendar,
  Settings,
  MessageCircle,
  Bell,
  FileWarning,
  Package,
  Video,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const { theme, setTheme } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const router = useRouter();

  // Dummy notification data (replace with real data in production)
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: "report",
      message: "New user report submitted",
      time: "2h ago",
    },
    {
      id: 2,
      type: "verification",
      message: "Specialist verification pending",
      time: "1h ago",
    },
    {
      id: 3,
      type: "report",
      message: "Content flagged for review",
      time: "30m ago",
    },
  ]);

  useEffect(() => {
    if (status === "unauthenticated" || (session && !session.user.isAdmin)) {
      router.push("/admin");
    }
  }, [status, session, router]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen text-black dark:text-white">
        Loading...
      </div>
    );
  }

  if (!session || !session.user.isAdmin) {
    return null;
  }

  const sidebarVariants = {
    open: { width: "16rem", transition: { duration: 0.3, ease: easeInOut } },
    closed: { width: "4rem", transition: { duration: 0.3, ease: easeInOut } },
  };

  return (
    <SidebarProvider>
      <motion.div
        className="flex min-h-screen w-full bg-white dark:bg-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Sidebar */}
        <motion.div
          variants={sidebarVariants}
          animate={isSidebarOpen ? "open" : "closed"}
          className="bg-[#F3CFC6] dark:bg-[#C4C4C4] shadow-lg border-r border-[#C4C4C4] dark:border-black relative"
        >
          <div className="absolute top-4 right-4 z-10">
            <SidebarTrigger onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
              <Menu className="h-5 w-5 text-black dark:text-white" />
            </SidebarTrigger>
          </div>
          <Sidebar>
            <SidebarHeader className="p-4 border-b border-[#C4C4C4] dark:border-black">
              <motion.div
                className="flex items-center gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <div
                  className="h-8 w-8 bg-[#C4C4C4] rounded-full"
                  aria-label="Hug Harmony Logo"
                />
                {isSidebarOpen && (
                  <h2 className="text-lg font-bold text-black dark:text-white">
                    Hug Harmony
                  </h2>
                )}
              </motion.div>
            </SidebarHeader>
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu className="pt-4">
                    {[
                      {
                        href: "/admin/dashboard",
                        label: "Dashboard",
                        icon: (
                          <LayoutDashboard className="h-5 w-5 text-black dark:text-white" />
                        ),
                      },
                      {
                        href: "/admin/dashboard/users",
                        label: "Users",
                        icon: (
                          <Users className="h-5 w-5 text-black dark:text-white" />
                        ),
                      },
                      {
                        href: "/admin/dashboard/specialists",
                        label: "Professionals",
                        icon: (
                          <UserCheck className="h-5 w-5 text-black dark:text-white" />
                        ),
                      },
                      {
                        href: "/admin/dashboard/specialist-applications",
                        label: "Applications",
                        icon: (
                          <UserCheck className="h-5 w-5 text-black dark:text-white" />
                        ),
                      },
                      {
                        href: "/admin/dashboard/stats",
                        label: "App Stats",
                        icon: (
                          <BarChart className="h-5 w-5 text-black dark:text-white" />
                        ),
                      },
                      {
                        href: "/admin/dashboard/reports",
                        label: "Reports",
                        icon: (
                          <Flag className="h-5 w-5 text-black dark:text-white" />
                        ),
                      },
                      {
                        href: "/admin/dashboard/dispute-handling",
                        label: "Dispute Handling",
                        icon: (
                          <FileWarning className="h-5 w-5 text-black dark:text-white" />
                        ),
                      },
                      {
                        href: "/admin/dashboard/bookings-payments",
                        label: "Bookings & Payments",
                        icon: (
                          <Calendar className="h-5 w-5 text-black dark:text-white" />
                        ),
                      },
                      {
                        href: "/admin/dashboard/messaging",
                        label: "Messaging Oversight",
                        icon: (
                          <MessageCircle className="h-5 w-5 text-black dark:text-white" />
                        ),
                      },
                      {
                        href: "/admin/dashboard/merchandise",
                        label: "Merchandise",
                        icon: (
                          <Package className="h-5 w-5 text-black dark:text-white" />
                        ),
                      },
                      {
                        href: "/admin/dashboard/training-videos",
                        label: "Training Videos",
                        icon: (
                          <Video className="h-5 w-5 text-black dark:text-white" />
                        ),
                      },
                    ].map((item) => (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton asChild>
                          <Link
                            href={item.href}
                            className="flex items-center gap-2 text-black dark:text-white hover:bg-[#E8A8A2] dark:hover:bg-[#A0A0A0] rounded-md transition-colors"
                          >
                            {item.icon}
                            {isSidebarOpen && <span>{item.label}</span>}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
            <SidebarFooter className="p-4 border-t border-[#C4C4C4] dark:border-black">
              <Button
                variant="ghost"
                className="w-full justify-start text-black dark:text-white hover:bg-[#E8A8A2] dark:hover:bg-[#A0A0A0]"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                {theme === "dark" ? (
                  <Sun className="h-4 w-4 mr-2" />
                ) : (
                  <Moon className="h-4 w-4 mr-2" />
                )}
                {isSidebarOpen &&
                  (theme === "dark" ? "Light Mode" : "Dark Mode")}
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start text-black dark:text-white hover:bg-[#E8A8A2] dark:hover:bg-[#A0A0A0]"
                onClick={() => router.push("/admin/dashboard/settings")}
              >
                <Settings className="h-4 w-4 mr-2" />
                {isSidebarOpen && "Settings"}
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start text-black dark:text-white hover:bg-[#E8A8A2] dark:hover:bg-[#A0A0A0]"
                onClick={() => signOut({ callbackUrl: "/admin" })}
              >
                <LogOut className="h-4 w-4 mr-2" />
                {isSidebarOpen && "Logout"}
              </Button>
            </SidebarFooter>
          </Sidebar>
        </motion.div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          <header className="bg-white dark:bg-black border-b border-[#C4C4C4] dark:border-black p-3 sticky top-0 z-10">
            <div className="flex items-center justify-between max-w-7xl mx-auto">
              <h1 className="text-xl font-semibold text-black dark:text-white">
                Hug Harmony Admin
              </h1>
              <div className="flex items-center gap-4">
                {/* Notification Bell */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      className="relative text-black dark:text-white"
                    >
                      <Bell className="h-5 w-5" />
                      {notifications.length > 0 && (
                        <Badge className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full h-5 w-5 flex items-center justify-center">
                          {notifications.length}
                        </Badge>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 bg-white dark:bg-[#1A1A1A] border-[#C4C4C4] dark:border-black">
                    <div className="flex flex-col gap-2">
                      <h3 className="text-sm font-semibold text-black dark:text-white">
                        Notifications
                      </h3>
                      {notifications.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          No new notifications
                        </p>
                      ) : (
                        notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className="p-2 rounded-md bg-[#F3CFC6] dark:bg-[#C4C4C4] text-black dark:text-white"
                          >
                            <p className="text-sm">{notification.message}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              {notification.time}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
                <Avatar className="h-10 w-10 border-2 border-[#F3CFC6]">
                  <AvatarImage
                    src={
                      session.user.profileImage ||
                      "/assets/images/avatar-placeholder.png"
                    }
                    alt="Admin"
                  />
                  <AvatarFallback className="bg-[#F3CFC6] text-black">
                    {session.user.name?.charAt(0) || "A"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-black dark:text-white">
                  {session.user.name || "Admin"}
                </span>
              </div>
            </div>
          </header>
          <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
            {children}
          </main>
        </div>
      </motion.div>
    </SidebarProvider>
  );
}
