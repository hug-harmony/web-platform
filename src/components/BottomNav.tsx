// components/BottomNav.tsx
"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { motion } from "framer-motion";
import {
  Home,
  Calendar,
  MessageSquare,
  MoreHorizontal,
  Package,
  LogOut,
  Video,
  CreditCard,
  Bell,
  Users,
  Eye,
  UserSearch,
  LayoutDashboard,
  Sparkles,
  ClipboardList,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useUserProfile } from "@/hooks/useUserProfile";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  highlight?: boolean;
}

const iconClass = "h-5 w-5";

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { user, isProfessional, applicationStatus, unreadNotifications } =
    useUserProfile();

  // User has started application if applicationStatus is not null
  const hasStartedApplication = applicationStatus !== null;

  // Main bottom tabs (always visible)
  const mainTabs = [
    { href: "/dashboard", label: "Home", icon: <Home className="h-5 w-5" /> },
    {
      href: "/dashboard/appointments",
      label: "Appointments",
      icon: <Calendar className="h-5 w-5" />,
    },
    {
      href: "/dashboard/messaging",
      label: "Messages",
      icon: <MessageSquare className="h-5 w-5" />,
    },
  ];

  // More menu items - aligned with Sidebar
  const moreMenuItems = useMemo<NavItem[]>(() => {
    const items: NavItem[] = [];

    // Professional application item - same logic as Sidebar
    if (!isProfessional) {
      if (hasStartedApplication) {
        items.push({
          href: "/dashboard/edit-profile/professional-application/status",
          label: "Application Status",
          icon: <ClipboardList className={iconClass} />,
        });
      } else {
        items.push({
          href: "/dashboard/edit-profile/professional-application",
          label: "Become a Pro",
          icon: <Sparkles className={iconClass} />,
          highlight: true,
        });
      }
    }

    // Core navigation items
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
        href: `/dashboard/edit-profile/${user.id}/orders`,
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
  }, [user.id, isProfessional, hasStartedApplication, unreadNotifications]);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const handleNavigation = (href: string) => {
    router.push(href);
    setOpen(false);
  };

  const handleLogout = async () => {
    setOpen(false);
    await signOut({ callbackUrl: "/login" });
  };

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 h-16 bg-white border-t shadow-lg md:hidden safe-area-pb">
      <div className="flex items-center justify-around h-full max-w-lg mx-auto">
        {mainTabs.map((tab) => {
          const active = isActive(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors ${
                active ? "text-[#F3CFC6]" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.icon}
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}

        {/* More Menu */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button className="flex flex-col items-center justify-center flex-1 h-full gap-0.5 text-gray-500 hover:text-gray-700 relative">
              <MoreHorizontal className="h-5 w-5" />
              <span className="text-[10px] font-medium">More</span>
              {/* Badge indicator for notifications or become a pro prompt */}
              {(unreadNotifications > 0 ||
                (!isProfessional && !hasStartedApplication)) && (
                <span
                  className={`absolute top-2 right-1/4 h-2 w-2 rounded-full ${
                    unreadNotifications > 0
                      ? "bg-red-500"
                      : "bg-[#F3CFC6] animate-pulse"
                  }`}
                />
              )}
            </button>
          </SheetTrigger>

          <SheetContent
            side="bottom"
            className="flex flex-col rounded-t-3xl p-0 h-[90vh]"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation Menu</SheetTitle>
            </SheetHeader>

            {/* Drag Handle - fixed */}
            <div className="flex justify-center py-3 shrink-0">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* User Card - fixed */}
            <div className="px-4 pb-4 shrink-0">
              <button
                onClick={() =>
                  handleNavigation(`/dashboard/edit-profile/${user.id}`)
                }
                className="flex items-center gap-3 p-3 w-full rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <Avatar className="h-12 w-12">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="text-lg">
                    {user.name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left min-w-0">
                  <p className="font-semibold truncate">{user.name}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {user.email}
                  </p>
                  {isProfessional && (
                    <span className="inline-block mt-1 bg-black text-[#F3CFC6] text-[10px] font-medium px-2 py-0.5 rounded">
                      Professional
                    </span>
                  )}
                </div>
              </button>
            </div>

            <Separator className="shrink-0" />

            {/* Menu Items - scrollable */}
            <ScrollArea className="flex-1 px-4">
              <div className="grid gap-1 pb-4">
                {moreMenuItems.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <motion.button
                      key={item.href}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleNavigation(item.href)}
                      className={`flex items-center gap-3 p-3 rounded-xl w-full text-left transition-colors ${
                        active
                          ? "bg-[#F5E6E8]"
                          : item.highlight
                            ? "bg-gradient-to-r from-[#F3CFC6]/30 to-transparent"
                            : "hover:bg-gray-50"
                      }`}
                    >
                      <div className="relative">
                        {item.icon}
                        {/* Badge for notifications */}
                        {item.badge && item.badge > 0 && (
                          <Badge className="absolute -top-2 -right-2 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-red-500">
                            {item.badge > 9 ? "9+" : item.badge}
                          </Badge>
                        )}
                        {/* Pulse indicator for highlighted items */}
                        {item.highlight && !active && (
                          <span className="absolute -top-1 -right-1 h-2 w-2 bg-[#F3CFC6] rounded-full animate-pulse" />
                        )}
                      </div>
                      <span className="font-medium flex-1">{item.label}</span>
                      {/* Arrow for highlighted items */}
                      {item.highlight && (
                        <span className="text-xs text-muted-foreground">
                          Get started →
                        </span>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Logout - fixed at bottom */}
            <div className="p-4 border-t bg-white shrink-0">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-red-600 hover:text-red-700 hover:bg-red-50 h-12 rounded-xl"
                onClick={handleLogout}
              >
                <LogOut className="h-5 w-5" />
                <span className="font-medium">Logout</span>
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
