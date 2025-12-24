// app/dashboard/appointments/page.tsx
import { Suspense } from "react";
import AppointmentsPage from "./AppointmentsPage";
import { Skeleton } from "@/components/ui/skeleton";

export default function Appointments() {
  return (
    <Suspense
      fallback={
        <div className="p-4 space-y-6 max-w-7xl mx-auto">
          <div className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg rounded-lg">
            <div className="p-6">
              <Skeleton className="h-8 w-48 bg-[#C4C4C4]/50" />
              <Skeleton className="h-4 w-64 mt-2 bg-[#C4C4C4]/50" />
            </div>
            <div className="p-6 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
              <Skeleton className="h-10 w-full sm:w-2/3 bg-[#C4C4C4]/50" />
              <Skeleton className="h-10 w-full sm:w-1/3 bg-[#C4C4C4]/50" />
            </div>
          </div>
          <div className="shadow-lg rounded-lg">
            <div className="p-6">
              <Skeleton className="h-8 w-48 bg-[#C4C4C4]/50" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                {[...Array(3)].map((_, i) => (
                  <Skeleton
                    key={i}
                    className="h-48 w-full bg-[#C4C4C4]/50 rounded-lg"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      }
    >
      <AppointmentsPage />
    </Suspense>
  );
}
