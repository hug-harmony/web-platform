"use client";
import React from "react";
import ClientSessionProvider from "@/components/ClientSessionProvider";
import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav"; // Import the new component
import { SidebarProvider } from "@/components/ui/sidebar";

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClientSessionProvider>
      <SidebarProvider defaultOpen={true}>
        <div className="flex min-h-screen w-full">
          <Sidebar />
          <main className="flex-1 transition-all duration-200 ease-in-out p-4 max-w-7xl mx-auto md:pb-0 pb-16">
            {" "}
            {/* Add pb-16 for mobile bottom bar height */}
            {children}
          </main>
        </div>
        <BottomNav />{" "}
        {/* Render bottom nav (it will self-hide on md+ screens) */}
      </SidebarProvider>
    </ClientSessionProvider>
  );
}
