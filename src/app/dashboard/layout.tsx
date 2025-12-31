// app/dashboard/layout.tsx
"use client";

import { UserProvider } from "@/hooks/useUserProfile";
import ClientSessionProvider from "@/components/ClientSessionProvider";
import Sidebar from "@/components/layout/Sidebar";
import { LastOnlineUpdater } from "@/components/LastOnlineUpdater";
import { EmailVerificationBanner } from "@/components/auth/email-verification-banner";
import IncomingCallDialog from "@/components/IncomingCallDialog";
import ApplicationProgressBanner from "@/components/layout/ApplicationProgressBanner";
import DashboardHeader from "@/components/layout/DashboardHeader";
import { PendingConfirmationsBanner } from "@/components/dashboard/PendingConfirmationsBanner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClientSessionProvider>
      <UserProvider>
        <div className="min-h-screen bg-gray-50/50">
          {/* Desktop Sidebar */}
          <Sidebar />

          {/* Main Content Area - with left margin for desktop sidebar */}
          <div className="lg:ml-64 min-h-screen flex flex-col">
            {/* Mobile top spacing */}
            <div className="h-14 lg:hidden" />

            {/* Sticky Banners Container */}
            <div className="sticky top-0 lg:top-0 z-30">
              <EmailVerificationBanner />
              <ApplicationProgressBanner />
              <PendingConfirmationsBanner />
            </div>

            <DashboardHeader />
            {/* Page Content */}
            <main className="flex-1 p-4 md:p-6 pb-20 lg:pb-6 max-w-7xl mx-auto w-full">
              <LastOnlineUpdater />
              {children}
              <IncomingCallDialog />
            </main>
          </div>
        </div>
      </UserProvider>
    </ClientSessionProvider>
  );
}
