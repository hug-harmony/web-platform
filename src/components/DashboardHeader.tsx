// components/DashboardHeader.tsx
// You can delete this file entirely since the sidebar now handles the header on desktop
// Or keep a minimal version if you want additional desktop header content:

"use client";

import Image from "next/image";
import Link from "next/link";
import NotificationsDropdown from "@/components/NotificationsDropdown";

export default function DashboardHeader() {
  return (
    <header className="hidden lg:flex h-14 items-center justify-end gap-4 border-b bg-white px-4 sticky top-0 z-20">
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
