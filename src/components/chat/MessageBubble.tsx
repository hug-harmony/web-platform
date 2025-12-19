// components/chat/MessageBubble.tsx
import React from "react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { format } from "date-fns";
import { toast } from "sonner";
import Link from "next/link";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { Check, X, Clock } from "lucide-react";
import type { ChatMessage } from "@/types/chat";

interface MessageBubbleProps {
  message: ChatMessage;
  isSender: boolean;
  handleProposalAction: (
    proposalId: string,
    action: "accepted" | "rejected"
  ) => Promise<void>;
  sending: boolean;
  currentUserId?: string;
}

const bubbleVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
};

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isSender,
  handleProposalAction,
  sending,
}) => {
  // Determine profile link - FIXED: Changed odI to userId
  const profileHref = message.sender.isProfessional
    ? `/dashboard/profile/${message.sender.userId || message.senderId}`
    : `/dashboard/profile/${message.senderId}`;

  const isProposal = !!message.proposalId;
  const isPending = message.proposalStatus === "pending";
  const isAccepted = message.proposalStatus === "accepted";
  const isRejected = message.proposalStatus === "rejected";

  return (
    <motion.div
      variants={bubbleVariants}
      initial="hidden"
      animate="visible"
      className={`flex ${isSender ? "justify-end" : "justify-start"} mb-4`}
    >
      <div
        className={`relative p-4 rounded-xl max-w-xs lg:max-w-md min-h-[3rem] flex flex-col gap-2 shadow-lg transition-all ${
          isProposal
            ? "border-2 border-[#F3CFC6] bg-gradient-to-br from-white to-[#FCF0ED]/50 dark:from-gray-800 dark:to-gray-700"
            : isSender
              ? "bg-gradient-to-br from-[#D8A7B1] to-[#F3CFC6] text-white"
              : "bg-gradient-to-br from-[#FCF0ED] to-[#F3CFC6]/50 text-black"
        }`}
      >
        {/* Sender info for received messages */}
        {!isSender && (
          <Link
            href={profileHref}
            className="flex items-center gap-2 -ml-1 -mt-1 mb-2 group"
          >
            <Avatar className="h-8 w-8 ring-2 ring-white/70 group-hover:ring-[#F3CFC6] transition-all">
              <AvatarImage
                src={message.sender.profileImage || undefined}
                alt={message.sender.name}
              />
              <AvatarFallback className="text-xs bg-gray-300">
                {message.sender.name?.[0]?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs font-semibold opacity-80 group-hover:underline group-hover:opacity-100 transition-all">
              {message.sender.name}
              {message.sender.isProfessional && (
                <span className="ml-1 text-[#D8A7B1]">(Pro)</span>
              )}
            </span>
          </Link>
        )}

        {/* Message content */}
        {message.isAudio ? (
          <div className="flex items-center gap-2">
            <span className="text-sm">🎵 Audio Message</span>
          </div>
        ) : message.imageUrl ? (
          <div className="relative w-full max-w-xs h-64 rounded-lg overflow-hidden">
            <Image
              src={message.imageUrl}
              alt={`Image sent by ${message.sender.name}`}
              fill
              className="object-cover"
              onError={() => toast.error("Failed to load image")}
            />
          </div>
        ) : (
          <p className="break-words text-sm font-medium leading-relaxed">
            {message.text}
          </p>
        )}

        {/* Proposal controls */}
        {isProposal && (
          <div className="mt-3 pt-3 border-t border-gray-200/50">
            {isPending && !isSender ? (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleProposalAction(message.proposalId!, "accepted")
                  }
                  disabled={sending}
                  className="flex-1 text-green-600 border-green-600 hover:bg-green-50 rounded-full text-xs"
                >
                  <Check className="h-3 w-3 mr-1" />
                  {message.initiator === "user" ? "Accept Request" : "Accept"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleProposalAction(message.proposalId!, "rejected")
                  }
                  disabled={sending}
                  className="flex-1 text-red-600 border-red-600 hover:bg-red-50 rounded-full text-xs"
                >
                  <X className="h-3 w-3 mr-1" />
                  {message.initiator === "user" ? "Decline" : "Reject"}
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {isPending && (
                  <>
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-500">
                      Pending response...
                    </span>
                  </>
                )}
                {isAccepted && (
                  <>
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-semibold text-green-600">
                      {message.initiator === "user"
                        ? "Request Accepted"
                        : "Proposal Accepted"}
                    </span>
                  </>
                )}
                {isRejected && (
                  <>
                    <X className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-semibold text-red-600">
                      {message.initiator === "user"
                        ? "Request Declined"
                        : "Proposal Rejected"}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Timestamp */}
        <div className="flex items-center justify-end mt-1">
          <span className="text-xs opacity-60">
            {format(new Date(message.createdAt), "HH:mm")}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default MessageBubble;
