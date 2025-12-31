// src/app/dashboard/payment/components/EmptyEarningsState.tsx

"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, Calendar, ArrowRight } from "lucide-react";
import Link from "next/link";

export function EmptyEarningsState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="border-dashed border-2 border-[#F3CFC6]/50">
        <CardContent className="py-12 text-center">
          {/* Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#F3CFC6]/30 to-[#F3CFC6]/10 flex items-center justify-center"
          >
            <Wallet className="w-10 h-10 text-[#F3CFC6]" />
          </motion.div>

          {/* Text */}
          <h3 className="text-xl font-semibold text-black dark:text-white mb-2">
            No Earnings Yet
          </h3>
          <p className="text-[#C4C4C4] max-w-md mx-auto mb-6">
            Complete your first session to start tracking your earnings. Your
            payment dashboard will show all your session earnings, platform
            fees, and payouts.
          </p>

          {/* How it works */}
          <div className="max-w-lg mx-auto mb-8">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="p-3 rounded-lg bg-[#F3CFC6]/10">
                <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-[#F3CFC6]/20 flex items-center justify-center text-[#F3CFC6] font-bold">
                  1
                </div>
                <p className="text-black dark:text-white font-medium">
                  Complete Sessions
                </p>
                <p className="text-xs text-[#C4C4C4] mt-1">Work with clients</p>
              </div>
              <div className="p-3 rounded-lg bg-[#F3CFC6]/10">
                <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-[#F3CFC6]/20 flex items-center justify-center text-[#F3CFC6] font-bold">
                  2
                </div>
                <p className="text-black dark:text-white font-medium">
                  Confirm Appointments
                </p>
                <p className="text-xs text-[#C4C4C4] mt-1">
                  Both parties confirm
                </p>
              </div>
              <div className="p-3 rounded-lg bg-[#F3CFC6]/10">
                <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-[#F3CFC6]/20 flex items-center justify-center text-[#F3CFC6] font-bold">
                  3
                </div>
                <p className="text-black dark:text-white font-medium">
                  Get Paid Weekly
                </p>
                <p className="text-xs text-[#C4C4C4] mt-1">Every Monday</p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              asChild
              className="bg-[#F3CFC6] hover:bg-[#F3CFC6]/80 text-black"
            >
              <Link href="/dashboard/availability">
                <Calendar className="w-4 h-4 mr-2" />
                Set Your Availability
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-[#F3CFC6] text-[#F3CFC6] hover:bg-[#F3CFC6]/10"
            >
              <Link href="/dashboard/appointments">
                View Appointments
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
