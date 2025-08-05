"use client";
import React from "react";
import ClientSessionProvider from "@/components/ui/ClientSessionProvider";
import Sidebar from "@/components/Sidebar";

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClientSessionProvider>
      <div className="flex min-h-screen">
        <div className="fixed top-0 left-0 h-full z-10">
          <Sidebar />
        </div>
        <main className="flex-1 ml-[60px] md:ml-[240px] p-4">{children}</main>
      </div>
    </ClientSessionProvider>
  );
}
