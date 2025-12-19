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

const iconClass = "h-5 w-5";

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { user, isProfessional, unreadNotifications } = useUserProfile();

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

  const moreMenuItems = useMemo(() => {
    const items = [
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
      },
    ];

    if (isProfessional) {
      items.push({
        href: "/dashboard/payment",
        label: "Payments",
        icon: <CreditCard className={iconClass} />,
      });
    }

    return items;
  }, [user.id, isProfessional, unreadNotifications]);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const handleNavigation = (href: string) => {
    router.push(href);
    setOpen(false);
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
              {unreadNotifications > 0 && (
                <span className="absolute top-2 right-1/4 h-2 w-2 bg-red-500 rounded-full" />
              )}
            </button>
          </SheetTrigger>

          <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation Menu</SheetTitle>
            </SheetHeader>

            {/* Drag Handle */}
            <div className="flex justify-center py-3">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* User Card */}
            <div className="px-4 pb-4">
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

            <Separator />

            {/* Menu Items */}
            <ScrollArea className="flex-1 h-[calc(85vh-200px)]">
              <div className="p-4 grid gap-1">
                {moreMenuItems.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <motion.button
                      key={item.href}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleNavigation(item.href)}
                      className={`flex items-center gap-3 p-3 rounded-xl w-full text-left transition-colors ${
                        active ? "bg-[#F5E6E8]" : "hover:bg-gray-50"
                      }`}
                    >
                      <div className="relative">
                        {item.icon}
                        {item.badge && item.badge > 0 && (
                          <Badge className="absolute -top-2 -right-2 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-red-500">
                            {item.badge > 9 ? "9+" : item.badge}
                          </Badge>
                        )}
                      </div>
                      <span className="font-medium">{item.label}</span>
                    </motion.button>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Logout */}
            <div className="p-4 border-t">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-red-600 hover:text-red-700 hover:bg-red-50 h-12 rounded-xl"
                onClick={() => signOut({ callbackUrl: "/login" })}
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
