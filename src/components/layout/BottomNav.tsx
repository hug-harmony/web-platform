// components/BottomNav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, MessageSquare, Search, User } from "lucide-react";
import { useUserProfile } from "@/hooks/useUserProfile";

export default function BottomNav() {
  const pathname = usePathname();
  const { user } = useUserProfile();

  const tabs = [
    { href: "/dashboard", label: "Home", icon: Home },
    { href: "/dashboard/professionals", label: "Search", icon: Search },
    { href: "/dashboard/appointments", label: "Bookings", icon: Calendar },
    { href: "/dashboard/messaging", label: "Messages", icon: MessageSquare },
    {
      href: `/dashboard/edit-profile/${user.id}`,
      label: "Profile",
      icon: User,
    },
  ];

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 h-16 bg-white border-t shadow-lg safe-area-pb">
      <div className="flex items-center justify-around h-full max-w-lg mx-auto">
        {tabs.map((tab) => {
          const active = isActive(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors ${
                active ? "text-[#F3CFC6]" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
