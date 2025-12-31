// src/app/dashboard/payment/components/PaymentPageSkeleton.tsx

"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function PaymentPageSkeleton() {
  return (
    <motion.div
      className="p-4 space-y-6 max-w-7xl mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Skeleton className="h-8 w-48 bg-[#C4C4C4]/20" />
          <Skeleton className="h-4 w-64 mt-2 bg-[#C4C4C4]/20" />
        </div>
        <div className="text-right">
          <Skeleton className="h-4 w-24 ml-auto bg-[#C4C4C4]/20" />
          <Skeleton className="h-5 w-32 mt-1 ml-auto bg-[#C4C4C4]/20" />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="bg-[#F3CFC6]/10">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <Skeleton className="h-4 w-20 bg-[#C4C4C4]/30" />
                <Skeleton className="h-8 w-8 rounded-full bg-[#C4C4C4]/30" />
              </div>
              <Skeleton className="h-8 w-28 mb-1 bg-[#C4C4C4]/30" />
              <Skeleton className="h-3 w-16 bg-[#C4C4C4]/30" />
              <div className="mt-4 pt-3 border-t border-[#C4C4C4]/20">
                <Skeleton className="h-3 w-full bg-[#C4C4C4]/30" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div>
        <div className="flex gap-2 mb-6">
          {[...Array(3)].map((_, i) => (
            <Skeleton
              key={i}
              className="h-10 w-28 rounded-md bg-[#C4C4C4]/20"
            />
          ))}
        </div>

        {/* Chart Placeholder */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40 bg-[#C4C4C4]/20" />
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-end justify-around gap-2">
              {[...Array(6)].map((_, i) => (
                <Skeleton
                  key={i}
                  className="flex-1 max-w-12 rounded-t-md bg-[#F3CFC6]/30"
                  style={{ height: `${30 + Math.random() * 60}%` }}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Table Placeholder */}
        <Card className="mt-6">
          <CardHeader>
            <Skeleton className="h-6 w-40 bg-[#C4C4C4]/20" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-lg bg-[#C4C4C4]/5"
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full bg-[#C4C4C4]/20" />
                    <div>
                      <Skeleton className="h-4 w-24 bg-[#C4C4C4]/20" />
                      <Skeleton className="h-3 w-16 mt-1 bg-[#C4C4C4]/20" />
                    </div>
                  </div>
                  <Skeleton className="h-5 w-16 bg-[#C4C4C4]/20" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
