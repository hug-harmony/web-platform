/* eslint-disable react-hooks/exhaustive-deps */
// app/components/BottomNav.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Calendar,
  MessageSquare,
  MoreHorizontal,
  Package,
  LogOut,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  MessageSquare as MessageIcon,
  Clock,
  User,
  Search,
  Video,
  CreditCard,
  Bell,
  Users,
  Eye,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import NotificationsDropdown from "@/components/NotificationsDropdown";
import { Badge } from "@/components/ui/badge";

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

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  const { data: session, status } = useSession();
  const [isProfessional, setIsProfessional] = useState(false);
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // Fetch profile data
  useEffect(() => {
    const fetchProfileAndProfessionalStatus = async () => {
      if (!session?.user?.id) return;

      try {
        const [profileRes, professionalRes, notificationsRes] =
          await Promise.all([
            fetch(`/api/users/${session.user.id}`, {
              cache: "no-store",
              credentials: "include",
            }),
            fetch("/api/professionals/application/me", {
              cache: "no-store",
              credentials: "include",
            }),
            fetch("/api/notifications/unread-count", {
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

        if (professionalRes.ok) {
          const { status } = await professionalRes.json();
          setIsProfessional(status === "APPROVED");
        }

        if (notificationsRes.ok) {
          const { count } = await notificationsRes.json();
          setUnreadNotifications(count);
        }
      } catch (error) {
        console.error("Fetch Error:", error);
      }
    };

    if (status === "authenticated") {
      fetchProfileAndProfessionalStatus();
    }
  }, [session, status]);

  // Compute user info
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

  const navItems: NavItem[] = useMemo(
    () => [
      {
        href: "/dashboard",
        label: "Dashboard",
        icon: <User className="h-5 w-5" />,
      },
      {
        href: "/dashboard/professionals",
        label: "Professionals",
        icon: <User className="h-5 w-5" />,
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
        href: "/dashboard/notifications",
        label: "Notifications",
        icon: <Bell className="h-5 w-5" />,
      },
      {
        href: "/dashboard/messaging",
        label: "Messages",
        icon: <MessageIcon className="h-5 w-5" />,
      },
      {
        href: "/dashboard/merchandise",
        label: "Merch",
        icon: <Package className="h-6 w-6" />,
      },
      {
        href: `/dashboard/profile/${user.id}/orders`,
        label: "My Orders",
        icon: <Package className="h-5 w-5" />,
      },
      {
        href: "/dashboard/forum",
        label: "Forum",
        icon: <Users className="h-5 w-5" />,
      },
      {
        href: "/dashboard/profile-visits",
        label: "Profile Visits",
        icon: <Eye className="h-5 w-5" />,
      },
      ...(isProfessional
        ? [
            {
              href: "/dashboard/payment",
              label: "Payments",
              icon: <CreditCard className="h-5 w-5" />,
            },
          ]
        : []),
    ],
    [isProfessional, user.id]
  );

  const mainTabs = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: <Home className="h-6 w-6" />,
    },
    {
      href: "/dashboard/appointments",
      label: "Appointments",
      icon: <Calendar className="h-6 w-6" />,
    },
    {
      href: "/dashboard/messaging",
      label: "Messages",
      icon: <MessageSquare className="h-6 w-6" />,
    },
  ];

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

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t bg-white shadow-lg md:hidden">
      {mainTabs.map((tab) => {
        const active = isActive(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs transition-colors ${
              active ? "text-[#F3CFC6]" : "text-gray-600"
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </Link>
        );
      })}

      {/* Fixed "More" Button */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            className="flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs text-gray-600 hover:text-[#F3CFC6]"
          >
            <MoreHorizontal className="h-6 w-6" />
            <span>More</span>
          </Button>
        </SheetTrigger>

        <SheetContent side="bottom" className="h-[80vh] p-0">
          {/* User Profile Section */}
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Menu</h2>
              <NotificationsDropdown />
            </div>

            <div
              className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => {
                router.push(`/dashboard/profile/${user.id}`);
                setOpen(false);
              }}
              role="button"
            >
              <Avatar className="h-12 w-12">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-semibold">{user.name}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                {isProfessional && (
                  <span className="mt-1 inline-block bg-black text-[#F3CFC6] text-xs font-medium px-2 py-1 rounded">
                    Professional
                  </span>
                )}
              </div>
            </div>
          </div>

          <ScrollArea className="h-[calc(100%-180px)] px-4">
            <div className="space-y-1 py-4">
              {navItems.map((item) => {
                const active = isActive(item.href);
                const isNotifications =
                  item.href === "/dashboard/notifications";

                return (
                  <motion.div
                    key={item.href}
                    whileHover={{ x: 4 }}
                    className={`flex items-center justify-between p-3 rounded-md transition-colors ${
                      active ? "bg-[#F5E6E8] text-black" : "hover:bg-gray-100"
                    }`}
                  >
                    <Link
                      href={item.href}
                      className="flex items-center gap-3 w-full"
                      onClick={() => setOpen(false)}
                    >
                      <div className="relative">
                        {item.icon}
                        {isNotifications && unreadNotifications > 0 && (
                          <Badge
                            className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 bg-red-500"
                            variant="destructive"
                          >
                            {unreadNotifications > 9
                              ? "9+"
                              : unreadNotifications}
                          </Badge>
                        )}
                      </div>
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </ScrollArea>

          {/* Logout Section */}
          <Separator />
          <div className="p-4">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5" />
              <span className="font-medium">Logout</span>
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
