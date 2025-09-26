"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Calendar,
  MessageSquare,
  MoreHorizontal,
  ChevronRight,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { motion } from "framer-motion";

// Reuse the NavItem type from your Sidebar (or define it here if needed)
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

  // Fetch specialist status (similar to Sidebar)
  useState(() => {
    const fetchSpecialistStatus = async () => {
      if (!session?.user?.id) return;
      try {
        const res = await fetch("/api/specialists/application/me", {
          cache: "no-store",
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
  });

  // Reuse navItems from Sidebar (hardcoded here for simplicity; you could import or fetch if dynamic)
  const navItems: NavItem[] = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: <Home className="h-5 w-5" />,
    },
    {
      href: "/dashboard/specialists",
      label: "Professionals",
      icon: <ChevronRight className="h-5 w-5" />,
    },
    {
      href: "/dashboard/users",
      label: "Explore",
      icon: <ChevronRight className="h-5 w-5" />,
    },
    {
      href: "/dashboard/appointments",
      label: "Appointments",
      icon: <ChevronRight className="h-5 w-5" />,
    },
    {
      href: "/dashboard/video-session",
      label: "Video Sessions",
      icon: <ChevronRight className="h-5 w-5" />,
    },
    {
      href: "/dashboard/payment",
      label: "Payments",
      icon: <ChevronRight className="h-5 w-5" />,
    },
    {
      href: "/dashboard/notifications",
      label: "Notifications",
      icon: <ChevronRight className="h-5 w-5" />,
    },
    {
      href: "/dashboard/session-notes",
      label: "Session Notes",
      icon: <ChevronRight className="h-5 w-5" />,
    },
    {
      href: "/dashboard/messaging",
      label: "Messages",
      icon: <ChevronRight className="h-5 w-5" />,
    },
    {
      href: "/dashboard/forum",
      label: "Forum",
      icon: <ChevronRight className="h-5 w-5" />,
    },
    {
      href: "/dashboard/proposals",
      label: "Proposals",
      icon: <ChevronRight className="h-5 w-5" />,
    },
    ...(isSpecialist
      ? [
          {
            href: "/dashboard/profile-visits",
            label: "Profile Visits",
            icon: <ChevronRight className="h-5 w-5" />,
          },
        ]
      : []),
  ];

  // 3 main tabs (customize these if needed)
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
    pathname === href || (pathname.startsWith(href) && href !== "/dashboard");

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t bg-white shadow-lg md:hidden">
      {mainTabs.map((tab) => (
        <Button
          key={tab.href}
          variant="ghost"
          className={`flex flex-col items-center justify-center p-2 ${isActive(tab.href) ? "text-[#F3CFC6]" : "text-gray-600"}`}
          onClick={() => router.push(tab.href)}
        >
          {tab.icon}
          <span className="text-xs">{tab.label}</span>
        </Button>
      ))}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            className="flex flex-col items-center justify-center p-2 text-gray-600"
          >
            <MoreHorizontal className="h-6 w-6" />
            <span className="text-xs">More</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[80vh] p-4">
          <ScrollArea className="h-full">
            <div className="space-y-4">
              {navItems.map((item) => (
                <motion.div
                  key={item.href}
                  whileHover={{ scale: 1.05 }}
                  className="flex items-center justify-between p-3 hover:bg-gray-100 rounded-md"
                >
                  <Link
                    href={item.href}
                    className="flex items-center gap-3"
                    onClick={() => setOpen(false)}
                  >
                    {item.icon}
                    <span className="font-medium">{item.label}</span>
                  </Link>
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
