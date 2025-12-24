// src/components/ProposalCard.tsx
"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  X,
  MessageSquare,
  Calendar,
  Clock,
  DollarSign,
  MapPin,
  Loader2,
  User,
} from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";

interface Proposal {
  id: string;
  userId: string;
  professionalId: string;
  startTime: string;
  endTime: string;
  venue?: "host" | "visit";
  status: "pending" | "accepted" | "rejected";
  conversationId: string;
  initiator?: string;
  user: { name: string; profileImage?: string };
  professional: { name: string; rate: number; image?: string };
}

interface ProposalCardProps {
  proposal: Proposal;
  isReceived: boolean;
  isProfessional: boolean;
  onStatusUpdate: (
    proposalId: string,
    status: "accepted" | "rejected"
  ) => void | Promise<void>;
  onViewConversation: (conversationId: string) => void;
}

const STATUS_CONFIG = {
  pending: {
    bg: "bg-yellow-100",
    text: "text-yellow-700",
    border: "border-yellow-300",
    label: "Pending",
  },
  accepted: {
    bg: "bg-green-100",
    text: "text-green-700",
    border: "border-green-300",
    label: "Accepted",
  },
  rejected: {
    bg: "bg-red-100",
    text: "text-red-700",
    border: "border-red-300",
    label: "Rejected",
  },
};

const VENUE_LABELS = {
  host: "Professional's Location",
  visit: "Client's Location",
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export default function ProposalCard({
  proposal,
  isReceived,
  isProfessional,
  onStatusUpdate,
  onViewConversation,
}: ProposalCardProps) {
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const statusConfig = STATUS_CONFIG[proposal.status];
  const canRespond = isReceived && proposal.status === "pending";

  // Calculate duration and cost
  const startDate = new Date(proposal.startTime);
  const endDate = new Date(proposal.endTime);
  const durationMs = endDate.getTime() - startDate.getTime();
  const durationHours = durationMs / (1000 * 60 * 60);
  const totalCost = durationHours * proposal.professional.rate;

  // Determine display name based on context
  const displayName = isReceived
    ? proposal.professional.name
    : proposal.user.name;
  const displayImage = isReceived
    ? proposal.professional.image
    : proposal.user.profileImage;

  // Handle accept
  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      await onStatusUpdate(proposal.id, "accepted");
    } finally {
      setIsAccepting(false);
    }
  };

  // Handle reject
  const handleReject = async () => {
    setIsRejecting(true);
    try {
      await onStatusUpdate(proposal.id, "rejected");
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <motion.div variants={itemVariants}>
      <Card
        className={`border-l-4 hover:shadow-lg transition-all ${
          proposal.status === "pending"
            ? "border-l-yellow-500"
            : proposal.status === "accepted"
              ? "border-l-green-500"
              : "border-l-red-500"
        }`}
      >
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              {displayImage ? (
                <img
                  src={displayImage}
                  alt={displayName}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="h-10 w-10 bg-[#F3CFC6] rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-black/60" />
                </div>
              )}
              <div>
                <p className="font-semibold text-black dark:text-white">
                  {displayName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isReceived ? "Proposal from" : "Proposal to"}{" "}
                  {isProfessional ? "client" : "professional"}
                </p>
              </div>
            </div>
            <Badge
              className={`${statusConfig.bg} ${statusConfig.text} border-0`}
            >
              {statusConfig.label}
            </Badge>
          </div>

          {/* Details */}
          <div className="space-y-2 text-sm">
            {/* Date & Time */}
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4 text-[#F3CFC6]" />
              <span>{format(startDate, "EEEE, MMMM d, yyyy")}</span>
            </div>

            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4 text-[#F3CFC6]" />
              <span>
                {format(startDate, "h:mm a")} - {format(endDate, "h:mm a")}
                <span className="ml-1 text-xs">
                  ({durationHours.toFixed(1)} hr{durationHours !== 1 ? "s" : ""}
                  )
                </span>
              </span>
            </div>

            {/* Venue */}
            {proposal.venue && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4 text-[#F3CFC6]" />
                <span>{VENUE_LABELS[proposal.venue]}</span>
              </div>
            )}

            {/* Cost */}
            <div className="flex items-center gap-2 text-muted-foreground">
              <DollarSign className="h-4 w-4 text-green-500" />
              <span className="font-medium text-black dark:text-white">
                ${totalCost.toFixed(2)}
              </span>
              <span className="text-xs">
                (${proposal.professional.rate}/hr × {durationHours.toFixed(1)}{" "}
                hrs)
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            {/* Accept/Reject buttons for pending proposals */}
            {canRespond && (
              <div className="flex gap-2">
                <Button
                  onClick={handleAccept}
                  disabled={isAccepting || isRejecting}
                  size="sm"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-full"
                >
                  {isAccepting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Accept
                </Button>
                <Button
                  onClick={handleReject}
                  disabled={isAccepting || isRejecting}
                  size="sm"
                  variant="outline"
                  className="flex-1 border-red-300 text-red-600 hover:bg-red-50 rounded-full"
                >
                  {isRejecting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <X className="h-4 w-4 mr-2" />
                  )}
                  Reject
                </Button>
              </div>
            )}

            {/* View Conversation button */}
            <Button
              onClick={() => onViewConversation(proposal.conversationId)}
              variant="outline"
              size="sm"
              className="w-full text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#F3CFC6]/10 rounded-full"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              View Conversation
            </Button>
          </div>

          {/* Status Message */}
          {proposal.status === "accepted" && (
            <div className="mt-3 p-2 bg-green-50 rounded-lg text-center">
              <p className="text-sm text-green-700">
                ✓ Appointment has been scheduled
              </p>
            </div>
          )}

          {proposal.status === "rejected" && (
            <div className="mt-3 p-2 bg-red-50 rounded-lg text-center">
              <p className="text-sm text-red-700">This proposal was declined</p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
