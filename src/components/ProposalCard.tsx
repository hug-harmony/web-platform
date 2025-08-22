"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, X, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";

interface Proposal {
  id: string;
  userId: string;
  specialistId: string;
  date: string;
  time: string;
  status: "pending" | "accepted" | "rejected";
  conversationId: string;
  user: { name: string };
  specialist: { name: string; rate: number };
}

interface ProposalCardProps {
  proposal: Proposal;
  isReceived: boolean;
  isSpecialist: boolean;
  onStatusUpdate: (proposalId: string, status: "accepted" | "rejected") => void;
  onViewConversation: (conversationId: string) => void;
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export default function ProposalCard({
  proposal,
  isReceived,
  isSpecialist,
  onStatusUpdate,
  onViewConversation,
}: ProposalCardProps) {
  return (
    <motion.div key={proposal.id} variants={itemVariants}>
      <Card className="border-[#F3CFC6] hover:shadow-lg transition-shadow">
        <CardContent className="p-4">
          <div className="space-y-2">
            <p className="text-lg font-medium text-black dark:text-white">
              {isSpecialist && isReceived
                ? `From: ${proposal.specialist.name}`
                : isSpecialist
                  ? `To: ${proposal.user.name}`
                  : `From: ${proposal.specialist.name}`}
            </p>
            <p className="text-sm text-[#C4C4C4]">
              Date: {format(new Date(proposal.date), "MMMM d, yyyy")}
            </p>
            <p className="text-sm text-[#C4C4C4]">Time: {proposal.time}</p>
            <p className="text-sm text-[#C4C4C4]">
              Status:{" "}
              {proposal.status.charAt(0).toUpperCase() +
                proposal.status.slice(1)}
            </p>
            {isSpecialist && (
              <p className="text-sm text-[#C4C4C4]">
                Amount: ${proposal.specialist.rate.toFixed(2)}
              </p>
            )}
            <div className="flex space-x-2 mt-2">
              {isReceived && proposal.status === "pending" && (
                <>
                  <Button
                    onClick={() => onStatusUpdate(proposal.id, "accepted")}
                    variant="outline"
                    size="sm"
                    className="text-green-600 border-green-600 hover:bg-green-600 hover:text-white rounded-full grow"
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Accept
                  </Button>
                  <Button
                    onClick={() => onStatusUpdate(proposal.id, "rejected")}
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-600 hover:bg-red-600 hover:text-white rounded-full grow "
                  >
                    <X className="mr-2 h-4 w-4" />
                    Reject
                  </Button>
                </>
              )}
            </div>
            <Button
              onClick={() => onViewConversation(proposal.conversationId)}
              variant="outline"
              size="sm"
              className="text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20 rounded-full grow w-full"
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              View Conversation
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
