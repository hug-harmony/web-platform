"use client";
import React from "react";
import ClientSessionProvider from "@/components/ClientSessionProvider";
import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import { SidebarProvider } from "@/components/ui/sidebar";
import Image from "next/image";
import hhIcon from "../../../public/hh-icon.png";
import Link from "next/link";
import { LastOnlineUpdater } from "@/components/LastOnlineUpdater";

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
          <main className="flex-1 transition-all duration-200 ease-in-out max-w-7xl mx-auto md:pb-0 pb-16">
            <div className="bg-white p-2 w-10 h-10 absolute top-6 right-6 hidden md:flex items-center justify-center rounded-md border border-gray-200 shadow-sm z-50">
              <Link href="/dashboard">
                <Image
                  src={hhIcon}
                  alt="Logo"
                  width={300}
                  height={300}
                  className="h-8 w-8 object-contain"
                />
              </Link>
            </div>
            <LastOnlineUpdater />
            {children}
          </main>
        </div>
        <BottomNav />
      </SidebarProvider>
    </ClientSessionProvider>
  );
}
