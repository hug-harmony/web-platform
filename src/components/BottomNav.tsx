// app/components/BottomNav.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Home, Calendar, MessageSquare, MoreHorizontal } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSession } from "next-auth/react";
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

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [isSpecialist, setIsSpecialist] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fetchSpecialistStatus = async () => {
      if (!session?.user?.id) return;
      try {
        const res = await fetch("/api/specialists/application/me", {
          cache: "no-store",
          credentials: "include",
        });
        if (res.ok) {
          const { status } = await res.json();
          setIsSpecialist(status === "approved");
        }
      } catch (error) {
        console.error("Error fetching specialist status:", error);
      }
    };
    fetchSpecialistStatus();
  }, [session]);

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
        href: "/dashboard/forum",
        label: "Forum",
        icon: <Users className="h-5 w-5" />,
      },
      {
        href: "/dashboard/profile-visits",
        label: "Profile Visits",
        icon: <Eye className="h-5 w-5" />,
      },
      ...(isSpecialist
        ? [
            {
              href: "/dashboard/payment",
              label: "Payments",
              icon: <CreditCard className="h-5 w-5" />,
            },
          ]
        : []),
    ],
    [isSpecialist]
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

        <SheetContent side="bottom" className="h-[80vh] p-4">
          <ScrollArea className="h-full pr-4">
            <div className="space-y-1">
              {navItems.map((item) => {
                const active = isActive(item.href);
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
                      {item.icon}
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
