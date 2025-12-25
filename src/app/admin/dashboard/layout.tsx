// src\app\admin\dashboard\layout.tsx

"use client";
import React from "react";
import AdminSessionProvider from "@/components/admin/AdminSessionProvider";
import AdminLayout from "@/components/admin/AdminLayout";

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
