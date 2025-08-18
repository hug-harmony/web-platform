"use client";
import React from "react";
import ClientSessionProvider from "@/components/ClientSessionProvider";
import Sidebar from "@/components/Sidebar";
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
          <main className="flex-1 transition-all duration-200 ease-in-out p-4 max-w-7xl mx-auto">
            {children}
          </main>
        </div>
      </SidebarProvider>
    </ClientSessionProvider>
  );
}
