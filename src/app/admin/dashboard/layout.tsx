"use client";
import React from "react";
import AdminSessionProvider from "@/components/AdminSessionProvider";
import AdminLayout from "@/components/AdminLayout";

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AdminSessionProvider>
      <AdminLayout>{children}</AdminLayout>
    </AdminSessionProvider>
  );
}
