// app/dashboard/layout.tsx
"use client";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { UserProvider } from "@/hooks/useUserProfile";
import ClientSessionProvider from "@/components/ClientSessionProvider";
import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import { LastOnlineUpdater } from "@/components/LastOnlineUpdater";
import DashboardHeader from "@/components/DashboardHeader";
import { EmailVerificationBanner } from "@/components/auth/email-verification-banner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClientSessionProvider>
      <UserProvider>
        <EmailVerificationBanner />
        <SidebarProvider defaultOpen={true}>
          <div className="flex min-h-screen w-full bg-gray-50/50">
            {/* Desktop Sidebar */}
            <Sidebar />

            {/* Main Content Area */}
            <SidebarInset className="flex flex-col flex-1">
              {/* Header - Desktop Only */}
              <DashboardHeader />

              {/* Page Content */}
              <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6 max-w-7xl mx-auto w-full">
                <LastOnlineUpdater />
                {children}
              </main>
            </SidebarInset>
          </div>

          {/* Mobile Bottom Navigation */}
          <BottomNav />
        </SidebarProvider>
      </UserProvider>
    </ClientSessionProvider>
  );
}
