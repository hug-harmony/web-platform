"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Sidebar as ShadcnSidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarProvider,
} from "@/components/ui/sidebar";
import {
  MessageSquare,
  Clock,
  User,
  Video,
  DollarSign,
  BookOpen,
  Bell,
  LogOut,
  Menu,
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

// Animation variants
const itemVariants = {
  open: { opacity: 1, x: 0, transition: { duration: 0.2 } },
  closed: { opacity: 0, x: -20, transition: { duration: 0.2 } },
};

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(true);
  const router = useRouter();
  const { data: session, status } = useSession();

  const toggleSidebar = () => setIsOpen(!isOpen);

  const navItems = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: <User className="h-5 w-5" />,
    },
    {
      href: "/dashboard/therapists",
      label: "Therapists",
      icon: <User className="h-5 w-5" />,
    },

    {
      href: "/dashboard/appointments",
      label: "Appointments",
      icon: <Clock className="h-5 w-5" />,
    },
    {
      href: "/messaging",
      label: "Messages",
      icon: <MessageSquare className="h-5 w-5" />,
    },
    {
      href: "/video",
      label: "Video Sessions",
      icon: <Video className="h-5 w-5" />,
    },
    {
      href: "/payment",
      label: "Payments",
      icon: <DollarSign className="h-5 w-5" />,
    },
    {
      href: "/notes-history",
      label: "Notes & Journal",
      icon: <BookOpen className="h-5 w-5" />,
    },
    {
      href: "/notifications",
      label: "Notifications",
      icon: <Bell className="h-5 w-5" />,
    },
  ];

  const handleLogout = async () => {
    try {
      signOut({ callbackUrl: "/login" });
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (status === "loading") {
    return <div className="p-4">Loading...</div>;
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  const user = {
    name: session?.user?.name || "User",
    email: session?.user?.email || "user@example.com",
    avatar: session?.user?.image || "/assets/images/avatar-placeholder.png",
  };

  return (
    <SidebarProvider>
      <motion.div
        className="h-full border-r"
        initial="open"
        animate={isOpen ? "open" : "closed"}
      >
        <ShadcnSidebar className="h-full">
          <SidebarHeader className="p-4">
            <div className="flex items-center justify-between">
              <motion.div
                className="flex items-center space-x-3"
                variants={itemVariants}
                animate={isOpen ? "open" : "closed"}
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                </Avatar>
                {isOpen && (
                  <div>
                    <p className="font-semibold">{user.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                )}
              </motion.div>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="md:hidden"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild>
                      <Link
                        href={item.href}
                        className="flex items-center space-x-2"
                      >
                        {item.icon}
                        {isOpen && <span>{item.label}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-5 w-5" />
                    {isOpen && <span>Logout</span>}
                  </Button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </ShadcnSidebar>
      </motion.div>
    </SidebarProvider>
  );
}
