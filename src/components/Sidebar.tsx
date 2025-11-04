"use client";

import { useEffect, useState, useMemo } from "react";
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
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  MessageSquare,
  Clock,
  User,
  LogOut,
  Video,
  CreditCard,
  Bell,
  Users,
  Eye,
  Package,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import NotificationsDropdown from "@/components/NotificationsDropdown";
import { motion, AnimatePresence } from "framer-motion";
import { useSidebar } from "@/components/ui/sidebar";

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

export default function Sidebar() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isSpecialist, setIsSpecialist] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const { open } = useSidebar();

  // === Fetch profile (non-blocking) ===
  useEffect(() => {
    const fetchProfileAndSpecialistStatus = async () => {
      if (!session?.user?.id) return;

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
                : data.name,
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            profileImage: data.profileImage,
          });
        }

        if (specialistRes.ok) {
          const { status } = await specialistRes.json();
          setIsSpecialist(status === "APPROVED");
        }
      } catch (error) {
        console.error("Fetch Error:", error);
      }
    };

    if (status === "authenticated") {
      fetchProfileAndSpecialistStatus();
    }
  }, [session, status]);

  // === Compute user info (from session + profile override) ===
  const user = useMemo(() => {
    return {
      id: session?.user?.id || "default-id",
      name: profile?.name || session?.user?.name || "User",
      email: profile?.email || session?.user?.email || "user@example.com",
      avatar:
        profile?.profileImage ||
        session?.user?.image ||
        "/assets/images/avatar-placeholder.png",
    };
  }, [profile, session]);

  // === Nav items ===
  const navItems: NavItem[] = useMemo(() => {
    const base = [
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
      // {
      //   href: "/dashboard/users",
      //   label: "Explore",
      //   icon: <Search className="h-5 w-5" />,
      // },
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
        href: "/dashboard/notifications",
        label: "Notifications",
        icon: <Bell className="h-5 w-5" />,
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
      {
        href: "/dashboard/merchandise",
        label: "Merch",
        icon: <Package className="h-5 w-5" />,
      },
      {
        href: `/dashboard/profile/${user.id}/orders`,
        label: "My Orders",
        icon: <Package className="h-5 w-5" />,
      },
      {
        href: "/dashboard/profile-visits",
        label: "Profile Visits",
        icon: <Eye className="h-5 w-5" />,
      },
      // {
      //   href: "/dashboard/training-videos",
      //   label: "Training",
      //   icon: <Video className="h-5 w-5" />,
      // },
    ];
    return isSpecialist
      ? [
          ...base,
          {
            href: "/dashboard/payment",
            label: "Payments",
            icon: <CreditCard className="h-5 w-5" />,
          },
        ]
      : base;
  }, [user.id, isSpecialist]);

  const isActive = (href: string) =>
    pathname === href ||
    (pathname.startsWith(href) &&
      href !== "/dashboard" &&
      pathname !== "/dashboard");

  const handleLogout = async () => {
    try {
      await signOut({ callbackUrl: "/login" });
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // === Render UI ===
  return (
    <ShadcnSidebar
      collapsible="offcanvas"
      className="fixed inset-y-0 z-10 bg-white border-r transition-[width] duration-200 ease-linear group-data-[collapsible=icon]:w-[80px]"
    >
      <SidebarHeader className="p-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <SidebarTrigger className="h-8 w-8" />
            <AnimatePresence>
              {open && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <NotificationsDropdown />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User section */}
          <div
            className="flex items-center space-x-3 cursor-pointer"
            onClick={() => router.push(`/dashboard/profile/${user.id}`)}
            role="button"
          >
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
            </Avatar>

            <AnimatePresence>
              {open && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <p className="font-semibold">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                  {isSpecialist && (
                    <span className="mt-1 inline-block bg-black text-[#F3CFC6] text-xs font-medium px-2 py-1 rounded">
                      Professional
                    </span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              </motion.div>
            )}
          </AnimatePresence>

          <SidebarMenu>
            <TooltipProvider>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(item.href)}
                        className={
                          isActive(item.href)
                            ? "bg-[#F5E6E8] text-black text-center"
                            : "hover:bg-gray-100"
                        }
                      >
                        <Link href={item.href}>
                          {item.icon}
                          <AnimatePresence>
                            {open && (
                              <motion.span
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: "auto" }}
                                exit={{ opacity: 0, width: 0 }}
                                transition={{ duration: 0.2 }}
                                className="truncate"
                              >
                                {item.label}
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </Link>
                      </SidebarMenuButton>
                    </TooltipTrigger>
                    <TooltipContent
                      side="right"
                      className="hidden group-data-[collapsible=icon]:block"
                    >
                      {item.label}
                    </TooltipContent>
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
                  <button
                    className="flex items-center gap-2 w-full text-left h-8 hover:bg-gray-100"
                    onClick={handleLogout}
                    aria-label="Logout"
                  >
                    <LogOut className="h-5 w-5" />
                    <AnimatePresence>
                      {open && (
                        <motion.span
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: "auto" }}
                          exit={{ opacity: 0, width: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          Logout
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </button>
                </SidebarMenuButton>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                className="hidden group-data-[collapsible=icon]:block"
              >
                Logout
              </TooltipContent>
            </Tooltip>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </ShadcnSidebar>
  );
}
