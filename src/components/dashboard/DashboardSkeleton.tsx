// src/components/dashboard/DashboardSkeleton.tsx
"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, staggerChildren: 0.2 },
  },
};

export function DashboardSkeleton() {
  return (
    <motion.div
      className="p-4 space-y-6 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Hero Skeleton */}
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
        <CardHeader>
          <div className="flex items-center space-x-4">
            <Skeleton className="h-16 w-16 rounded-full bg-[#C4C4C4]/50" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-48 bg-[#C4C4C4]/50" />
              <Skeleton className="h-4 w-64 bg-[#C4C4C4]/50" />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Action Tiles Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="shadow-lg">
            <CardContent className="flex items-center space-x-4 p-6">
              <Skeleton className="h-8 w-8 bg-[#C4C4C4]/50" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-32 bg-[#C4C4C4]/50" />
                <Skeleton className="h-4 w-48 bg-[#C4C4C4]/50" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Messages Skeleton */}
      <Card className="shadow-lg">
        <CardHeader>
          <Skeleton className="h-8 w-48 bg-[#C4C4C4]/50" />
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[200px]">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2 mb-2"
              >
                <div className="flex items-center space-x-3">
                  <Skeleton className="h-10 w-10 rounded-full bg-[#C4C4C4]/50" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32 bg-[#C4C4C4]/50" />
                    <Skeleton className="h-3 w-48 bg-[#C4C4C4]/50" />
                  </div>
                </div>
                <Skeleton className="h-4 w-16 bg-[#C4C4C4]/50" />
              </div>
            ))}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Appointments Skeleton */}
      <Card className="shadow-lg">
        <CardHeader>
          <Skeleton className="h-8 w-48 bg-[#C4C4C4]/50" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-full mb-4 bg-[#C4C4C4]/50" />
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-2 mb-2">
              <div className="space-y-2">
                <Skeleton className="h-4 w-32 bg-[#C4C4C4]/50" />
                <Skeleton className="h-3 w-48 bg-[#C4C4C4]/50" />
              </div>
              <Skeleton className="h-8 w-16 bg-[#C4C4C4]/50" />
            </div>
          ))}
        </CardContent>
      </Card>
    </motion.div>
  );
}
