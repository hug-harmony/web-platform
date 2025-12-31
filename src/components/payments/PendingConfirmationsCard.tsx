// src/app/dashboard/payment/components/PendingConfirmationsCard.tsx

"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Clock, MapPin, ChevronRight } from "lucide-react";
import { ConfirmationWithDetails } from "@/types/payments";
import { formatDistanceToNow } from "date-fns";

interface PendingConfirmationsCardProps {
  confirmations: (ConfirmationWithDetails & {
    role: "client" | "professional";
  })[];
  onConfirmClick: (appointmentId: string) => void;
}

export function PendingConfirmationsCard({
  confirmations,
  onConfirmClick,
}: PendingConfirmationsCardProps) {
  if (confirmations.length === 0) return null;

  const formatTime = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Card className="border-yellow-300 dark:border-yellow-700 bg-yellow-50/50 dark:bg-yellow-900/10">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-full bg-yellow-200 dark:bg-yellow-800">
            <AlertCircle className="w-4 h-4 text-yellow-700 dark:text-yellow-300" />
          </div>
          <CardTitle className="text-lg text-yellow-800 dark:text-yellow-200">
            Pending Confirmations
          </CardTitle>
          <Badge
            variant="secondary"
            className="ml-auto bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200"
          >
            {confirmations.length}
          </Badge>
        </div>
        <p className="text-sm text-yellow-700/80 dark:text-yellow-300/80 mt-1">
          Please confirm whether these appointments occurred
        </p>
      </CardHeader>

      <CardContent className="space-y-3">
        <AnimatePresence>
          {confirmations.slice(0, 3).map((confirmation, index) => (
            <motion.div
              key={confirmation.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-yellow-200 dark:border-yellow-800/50"
            >
              {/* Avatar */}
              <Avatar className="h-10 w-10 border-2 border-[#F3CFC6]">
                <AvatarImage
                  src={
                    confirmation.role === "client"
                      ? undefined // Professional's image would go here
                      : confirmation.client.profileImage || undefined
                  }
                />
                <AvatarFallback className="bg-[#F3CFC6]/20 text-[#F3CFC6]">
                  {confirmation.role === "client"
                    ? confirmation.professional.name.charAt(0)
                    : confirmation.client.name.charAt(0)}
                </AvatarFallback>
              </Avatar>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-black dark:text-white truncate">
                    {confirmation.role === "client"
                      ? confirmation.professional.name
                      : confirmation.client.name}
                  </p>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {confirmation.role === "client" ? "You booked" : "Client"}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-[#C4C4C4] mt-0.5">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(confirmation.appointment.startTime)} at{" "}
                    {formatTime(confirmation.appointment.startTime)}
                  </span>
                  {confirmation.appointment.venue && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {confirmation.appointment.venue === "host"
                        ? "At their place"
                        : "At your place"}
                    </span>
                  )}
                </div>
              </div>

              {/* Action */}
              <Button
                size="sm"
                onClick={() => onConfirmClick(confirmation.appointmentId)}
                className="bg-[#F3CFC6] hover:bg-[#F3CFC6]/80 text-black shrink-0"
              >
                Confirm
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Show more */}
        {confirmations.length > 3 && (
          <button className="w-full py-2 text-sm text-yellow-700 dark:text-yellow-300 hover:underline">
            View {confirmations.length - 3} more confirmation
            {confirmations.length - 3 !== 1 ? "s" : ""}
          </button>
        )}
      </CardContent>
    </Card>
  );
}
