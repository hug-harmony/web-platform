"use client";

import { useEffect, useState, useMemo } from "react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

const itemVariants = {
  open: { opacity: 1, x: 0, transition: { duration: 0.2 } },
  closed: { opacity: 0, x: -20, transition: { duration: 0.2 } },
};

const sidebarVariants = {
  open: { width: "250px" },
  closed: { width: "80px" },
};

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sidebarOpen") !== "false";
    }
    return true;
  });
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isSpecialist, setIsSpecialist] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();

  const toggleSidebar = () => {
    setIsOpen((prev) => {
      localStorage.setItem("sidebarOpen", (!prev).toString());
      return !prev;
    });
  };

  const navItems: NavItem[] = useMemo(
    () => [
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
    ],
    []
  );

  useEffect(() => {
    const fetchProfileAndSpecialistStatus = async () => {
      if (!session?.user?.id || !/^[0-9a-fA-F]{24}$/.test(session.user.id))
        return;
      setIsLoadingProfile(true);

      try {
        const [profileRes, specialistRes] = await Promise.all([
          fetch(`/api/users/${session.user.id}`, {
            cache: "no-store",
            credentials: "include",
          }),
          fetch("/api/specialists/application/me", {
            cache: "no-store",
            credentials: "include",
          }),
        ]);

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

        if (specialistRes.ok) {
          const { status } = await specialistRes.json();
          setIsSpecialist(status === "approved");
        }
      } catch (error) {
        console.error("Fetch Error:", error);
      } finally {
        setIsLoadingProfile(false);
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

  if (status === "loading" || isLoadingProfile) {
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

  // Check if the current path exactly matches the item href or is a subpath but not just "/dashboard"
  const isActive = (href: string) =>
    pathname === href ||
    (pathname.startsWith(href) &&
      href !== "/dashboard" &&
      pathname !== "/dashboard");

  return (
    <SidebarProvider>
      <motion.div
        className="h-screen border-r bg-white"
        initial="open"
        animate={isOpen ? "open" : "closed"}
        variants={sidebarVariants}
        role="navigation"
        aria-label="Sidebar"
      >
        <ShadcnSidebar className="h-full">
          <SidebarHeader className="p-4">
            <div className="flex items-center justify-between">
              <motion.div
                className="flex items-center space-x-3 cursor-pointer"
                variants={itemVariants}
                animate={isOpen ? "open" : "closed"}
                onClick={() => router.push(`/dashboard/profile/${user.id}`)}
                role="button"
                aria-label={`View profile of ${user.name}`}
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
                      <span className="mt-1 inline-block bg-black text-[#F3CFC6] text-xs font-medium px-2 py-1 rounded">
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
                aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
              >
                <Menu className="h-5 w-5" />
              </Button>
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarMenu>
                <TooltipProvider>
                  {navItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton asChild>
                            <Link
                              href={item.href}
                              className={`flex items-center space-x-2 ${
                                isActive(item.href)
                                  ? "bg-[#F5E6E8] text-black"
                                  : "hover:bg-gray-100"
                              }`}
                              aria-current={
                                isActive(item.href) ? "page" : undefined
                              }
                            >
                              {item.icon}
                              {isOpen && <span>{item.label}</span>}
                            </Link>
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        {!isOpen && (
                          <TooltipContent side="right">
                            {item.label}
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </SidebarMenuItem>
                  ))}
                </TooltipProvider>
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SidebarMenuButton asChild>
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={handleLogout}
                        aria-label="Logout"
                      >
                        <LogOut className="h-5 w-5" />
                        {isOpen && <span>Logout</span>}
                      </Button>
                    </SidebarMenuButton>
                  </TooltipTrigger>
                  {!isOpen && (
                    <TooltipContent side="right">Logout</TooltipContent>
                  )}
                </Tooltip>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </ShadcnSidebar>
      </motion.div>
    </SidebarProvider>
  );
}
