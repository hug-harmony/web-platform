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
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
import { useTheme } from "next-themes";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const { theme, setTheme } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated" || (session && !session.user.isAdmin)) {
      router.push("/admin");
    }
  }, [status, session, router]);

  if (status === "loading") {
    return <div>Loading...</div>;
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
                        href: "/admin/dashboard/bookings-payments",
                        label: "Bookings & Payments",
                        icon: (
                          <Calendar className="h-5 w-5 text-black dark:text-white" />
                        ),
                      },
                    ].map((item) => (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton asChild>
                          <Link
                            href={item.href}
                            className="flex items-center gap-2 text-black dark:text-white"
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
                className="w-full justify-start text-black dark:text-white"
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
                className="w-full justify-start text-black dark:text-white"
                onClick={() => router.push("/admin/dashboard/settings")}
              >
                <Settings className="h-4 w-4 mr-2" />
                {isSidebarOpen && "Settings"}
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start text-black dark:text-white"
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
