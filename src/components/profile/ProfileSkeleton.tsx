// src/app/dashboard/profile/[id]/ProfileSkeleton.tsx

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileSkeleton() {
  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto">
      <Card className="shadow-lg pt-0 overflow-hidden">
        <div className="relative h-64 sm:h-80">
          <Skeleton className="absolute inset-0 bg-[#C4C4C4]/50" />
          <div className="relative flex justify-center items-center h-full">
            <Skeleton className="w-40 h-40 rounded-full border-4 border-white bg-[#C4C4C4]/50" />
          </div>
        </div>
        <CardContent className="pt-6 space-y-4 text-center">
          <Skeleton className="h-8 w-64 mx-auto bg-[#C4C4C4]/50" />
          <Skeleton className="h-4 w-48 mx-auto bg-[#C4C4C4]/50" />
          <div className="flex justify-center gap-2">
            {[...Array(4)].map((_, idx) => (
              <Skeleton
                key={idx}
                className="h-6 w-20 rounded-full bg-[#C4C4C4]/50"
              />
            ))}
          </div>
          <Skeleton className="h-20 w-full max-w-2xl mx-auto bg-[#C4C4C4]/50" />
          <div className="flex justify-center gap-4">
            {[...Array(4)].map((_, idx) => (
              <Skeleton
                key={idx}
                className="h-10 w-40 rounded-full bg-[#C4C4C4]/50"
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
