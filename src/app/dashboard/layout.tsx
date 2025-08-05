import React from "react";
import ClientSessionProvider from "@/components/ui/ClientSessionProvider";

export default function layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div>
      <ClientSessionProvider>{children}</ClientSessionProvider>
    </div>
  );
}
