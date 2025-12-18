// components/Sidebar.tsx
"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
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
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useUserProfile } from "@/hooks/useUserProfile";
import {
  MessageSquare,
  Clock,
  LogOut,
  Video,
  CreditCard,
  Bell,
  Users,
  Eye,
  Package,
  Sparkles,
  LayoutDashboard,
  UserSearch,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

const iconClass = "h-5 w-5 shrink-0";

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { open } = useSidebar();
  const { user, isProfessional, applicationStatus, unreadNotifications } =
    useUserProfile();

  // Build navigation items
  const navItems = useMemo<NavItem[]>(() => {
    const items: NavItem[] = [];

    // Professional application item
    if (!isProfessional) {
      items.push({
        href:
          applicationStatus === "none"
            ? "/dashboard/profile/professional-application/status"
            : "/dashboard/professional/status",
        label:
          applicationStatus === "none" ? "Become a Pro" : "Application Status",
        icon:
          applicationStatus === "none" ? (
            <Sparkles className={iconClass} />
          ) : (
            <Clock className={iconClass} />
          ),
      });
    }

    // Core navigation
    items.push(
      {
        href: "/dashboard",
        label: "Dashboard",
        icon: <LayoutDashboard className={iconClass} />,
      },
      {
        href: "/dashboard/professionals",
        label: "Professionals",
        icon: <UserSearch className={iconClass} />,
      },
      {
        href: "/dashboard/appointments",
        label: "Appointments",
        icon: <Clock className={iconClass} />,
      },
      {
        href: "/dashboard/video-session",
        label: "Video Sessions",
        icon: <Video className={iconClass} />,
      },
      {
        href: "/dashboard/notifications",
        label: "Notifications",
        icon: <Bell className={iconClass} />,
        badge: unreadNotifications,
      },
      {
        href: "/dashboard/messaging",
        label: "Messages",
        icon: <MessageSquare className={iconClass} />,
      },
      {
        href: "/dashboard/forum",
        label: "Forum",
        icon: <Users className={iconClass} />,
      },
      {
        href: "/dashboard/merchandise",
        label: "Merch",
        icon: <Package className={iconClass} />,
      },
      {
        href: `/dashboard/profile/${user.id}/orders`,
        label: "My Orders",
        icon: <Package className={iconClass} />,
      },
      {
        href: "/dashboard/profile-visits",
        label: "Profile Visits",
        icon: <Eye className={iconClass} />,
      }
    );

    // Professional-only items
    if (isProfessional) {
      items.push({
        href: "/dashboard/payment",
        label: "Payments",
        icon: <CreditCard className={iconClass} />,
      });
    }

    return items;
  }, [user.id, isProfessional, applicationStatus, unreadNotifications]);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  return (
    <ShadcnSidebar collapsible="icon" className="border-r bg-white">
      <SidebarHeader className="p-4">
        {/* User Profile Card */}
        <button
          onClick={() => router.push(`/dashboard/profile/${user.id}`)}
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors w-full text-left"
          aria-label="View profile"
        >
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
          </Avatar>

          <AnimatePresence mode="wait">
            {open && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
                className="flex-1 min-w-0"
              >
                <p className="font-semibold truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.email}
                </p>
                {isProfessional && (
                  <span className="mt-1 inline-block bg-black text-[#F3CFC6] text-[10px] font-medium px-2 py-0.5 rounded">
                    Professional
                  </span>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              </motion.div>
            )}
          </AnimatePresence>

          <SidebarMenu>
            <TooltipProvider delayDuration={0}>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(item.href)}
                        className={
                          isActive(item.href) ? "bg-[#F5E6E8] text-black" : ""
                        }
                      >
                        <Link href={item.href} className="relative">
                          {item.icon}
                          {/* Badge for collapsed state */}
                          {item.badge && item.badge > 0 && !open && (
                            <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                              {item.badge > 9 ? "9+" : item.badge}
                            </span>
                          )}
                          <span className="truncate">{item.label}</span>
                          {/* Badge for expanded state */}
                          {item.badge && item.badge > 0 && open && (
                            <span className="ml-auto bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                              {item.badge > 99 ? "99+" : item.badge}
                            </span>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </TooltipTrigger>
                    {!open && (
                      <TooltipContent side="right">
                        {item.label}
                        {item.badge && item.badge > 0 && ` (${item.badge})`}
                      </TooltipContent>
                    )}
                  </Tooltip>
                </SidebarMenuItem>
              ))}
            </TooltipProvider>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <SidebarMenuButton
                    onClick={handleLogout}
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    <LogOut className={iconClass} />
                    <span>Logout</span>
                  </SidebarMenuButton>
                </TooltipTrigger>
                {!open && <TooltipContent side="right">Logout</TooltipContent>}
              </Tooltip>
            </TooltipProvider>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </ShadcnSidebar>
  );
}
