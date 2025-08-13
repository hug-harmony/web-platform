"use client";

import { useEffect, useState } from "react";
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
  LogOut,
  Menu,
  Search,
  Video,
  CreditCard,
  Bell,
  Notebook,
  Users,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

interface Profile {
  id: string;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  profileImage?: string | null;
}

// Animation variants
const itemVariants = {
  open: { opacity: 1, x: 0, transition: { duration: 0.2 } },
  closed: { opacity: 0, x: -20, transition: { duration: 0.2 } },
};

const sidebarVariants = {
  open: { width: "250px" },
  closed: { width: "80px" },
};

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isSpecialist, setIsSpecialist] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();

  const toggleSidebar = () => setIsOpen(!isOpen);

  const navItems: NavItem[] = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: <User className="h-5 w-5" />,
    },
    {
      href: "/dashboard/specialists",
      label: "Professionals",
      icon: <User className="h-5 w-5" />,
    },
    {
      href: "/dashboard/users",
      label: "Explore",
      icon: <Search className="h-5 w-5" />,
    },
    {
      href: "/dashboard/appointments",
      label: "Appointments",
      icon: <Clock className="h-5 w-5" />,
    },
    {
      href: "/dashboard/video-session",
      label: "Video Sessions",
      icon: <Video className="h-5 w-5" />,
    },
    {
      href: "/dashboard/payment",
      label: "Payments",
      icon: <CreditCard className="h-5 w-5" />,
    },
    {
      href: "/dashboard/notifications",
      label: "Notifications",
      icon: <Bell className="h-5 w-5" />,
    },
    {
      href: "/dashboard/session-notes",
      label: "Session Notes",
      icon: <Notebook className="h-5 w-5" />,
    },
    {
      href: "/dashboard/messaging",
      label: "Messages",
      icon: <MessageSquare className="h-5 w-5" />,
    },
    {
      href: "/dashboard/forum",
      label: "Forum",
      icon: <Users className="h-5 w-5" />,
    },
  ];

  useEffect(() => {
    const fetchProfileAndSpecialistStatus = async () => {
      if (!session?.user?.id || !/^[0-9a-fA-F]{24}$/.test(session.user.id))
        return;

      try {
        // Fetch profile
        const profileRes = await fetch(`/api/users/${session.user.id}`, {
          cache: "no-store",
          credentials: "include",
        });
        if (profileRes.ok) {
          const data = await profileRes.json();
          setProfile({
            id: data.id,
            name:
              data.firstName && data.lastName
                ? `${data.firstName} ${data.lastName}`
                : null,
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            profileImage: data.profileImage,
          });
        }

        // Fetch specialist application status
        const specialistRes = await fetch("/api/specialists/application/me", {
          cache: "no-store",
          credentials: "include",
        });
        if (specialistRes.ok) {
          const { status } = await specialistRes.json();
          setIsSpecialist(status === "approved");
        }
      } catch (error) {
        console.error("Fetch Error:", error);
      }
    };

    if (status === "authenticated") fetchProfileAndSpecialistStatus();
  }, [session, status]);

  const handleLogout = async () => {
    try {
      await signOut({ callbackUrl: "/login" });
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (status === "loading") {
    return (
      <div className="p-4 flex items-center justify-center h-screen">
        Loading...
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return (
      <div className="p-4 flex items-center justify-center h-screen">
        Redirecting to login...
      </div>
    );
  }

  const user = {
    name: profile?.name || session?.user?.name || "User",
    email: profile?.email || session?.user?.email || "user@example.com",
    avatar:
      profile?.profileImage ||
      session?.user?.image ||
      "/assets/images/avatar-placeholder.png",
    id: session?.user?.id || "default-id",
  };

  return (
    <SidebarProvider>
      <motion.div
        className="h-screen border-r bg-white"
        initial="open"
        animate={isOpen ? "open" : "closed"}
        variants={sidebarVariants}
      >
        <ShadcnSidebar className="h-full">
          <SidebarHeader className="p-4">
            <div className="flex items-center justify-between">
              <motion.div
                className="flex items-center space-x-3"
                variants={itemVariants}
                animate={isOpen ? "open" : "closed"}
                onClick={() => router.push(`/dashboard/profile/${user.id}`)}
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
                    {isSpecialist && (
                      <span className="mt-1 inline-block  bg-black text-[#F3CFC6] text-xs font-medium px-2 py-1 rounded">
                        Professional
                      </span>
                    )}
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
                        className={`flex items-center space-x-2 ${
                          pathname === item.href ||
                          pathname.startsWith(item.href + "/")
                            ? "bg-[#F5E6E8] text-black"
                            : "hover:bg-gray-100"
                        }`}
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
