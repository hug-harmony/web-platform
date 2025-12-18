// components/DashboardHeader.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import NotificationsDropdown from "@/components/NotificationsDropdown";

export default function DashboardHeader() {
  return (
    <header className="hidden md:flex h-14 items-center gap-4 border-b bg-white px-4 sticky top-0 z-40">
      <SidebarTrigger className="h-8 w-8" />
      <Separator orientation="vertical" className="h-6" />

      <div className="flex-1" />

      <NotificationsDropdown />

      <Link
        href="/dashboard"
        className="flex items-center justify-center h-9 w-9 rounded-md border bg-white shadow-sm hover:bg-gray-50 transition-colors"
      >
        <Image
          src="/hh-icon.png"
          alt="Dashboard Home"
          width={24}
          height={24}
          className="h-6 w-6 object-contain"
        />
      </Link>
    </header>
  );
}
