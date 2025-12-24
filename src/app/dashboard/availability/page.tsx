// src\app\dashboard\availability\page.tsx
import { Suspense } from "react";
import ManageAvailabilityPage from "./ManageAvailabilityPage";
import { Skeleton } from "@/components/ui/skeleton";

// Server component to wrap the client component with Suspense
export default function AvailabilityPage() {
  return (
    <Suspense
      fallback={
        <div className="p-4 space-y-6 max-w-7xl mx-auto">
          <div className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg rounded-lg">
            <div className="p-6">
              <Skeleton className="h-8 w-48 bg-[#C4C4C4]/50" />
              <Skeleton className="h-4 w-64 mt-2 bg-[#C4C4C4]/50" />
            </div>
            <div className="p-6 flex space-x-4">
              <Skeleton className="h-10 w-40 rounded-full bg-[#C4C4C4]/50" />
            </div>
          </div>
          <div className="shadow-lg rounded-lg">
            <div className="p-6 space-y-4">
              <Skeleton className="h-40 w-full bg-[#C4C4C4]/50" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-24 bg-[#C4C4C4]/50" />
                <Skeleton className="h-10 w-full bg-[#C4C4C4]/50" />
              </div>
              <Skeleton className="h-40 w-full bg-[#C4C4C4]/50" />
              <Skeleton className="h-10 w-40 rounded-full bg-[#C4C4C4]/50" />
            </div>
          </div>
        </div>
      }
    >
      <ManageAvailabilityPage />
    </Suspense>
  );
}
