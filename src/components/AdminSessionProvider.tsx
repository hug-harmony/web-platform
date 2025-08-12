// src/components/admin/AdminSessionProvider.tsx
"use client";

import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";

const mockAdminSession: Session = {
  user: {
    id: "admin_mock_1",
    name: "Admin Developer",
    email: "admin@example.com",
    image: "/assets/images/avatar-placeholder.png",
  },
  expires: "2099-12-31T23:59:59.999Z", // far future date so it never "expires"
};

export default function AdminSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider session={mockAdminSession}>{children}</SessionProvider>
  );
}
