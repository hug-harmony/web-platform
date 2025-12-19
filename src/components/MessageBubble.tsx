import React from "react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { format } from "date-fns";
import { toast } from "sonner";
import Link from "next/link";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface Message {
  senderId: string;
  id: string;
  text: string;
  isAudio: boolean;
  imageUrl?: string;
  createdAt: string;
  sender: {
    name?: string | null;
    profileImage?: string | null;
    isProfessional?: boolean;
    userId?: string | null;
  };
  userId: string;
  proposalId?: string;
  proposalStatus?: string;
  initiator?: "user" | "professional";
}

interface MessageBubbleProps {
  message: Message;
  isSender: boolean;
  handleProposalAction: (
    proposalId: string,
    action: "accepted" | "rejected"
  ) => Promise<void>;
  sending: boolean;
  currentUserId: string; // needed for chat
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isSender,
  handleProposalAction,
  sending,
}) => {
  // Determine profile link
  const profileHref = message.sender.isProfessional
    ? `/dashboard/profile/${message.sender.userId || message.senderId}`
    : `/dashboard/profile/${message.senderId}`;

  return (
    <div className={`flex ${isSender ? "justify-end" : "justify-start"} mb-4`}>
      <div
        className={`relative p-4 rounded-xl max-w-xs lg:max-w-md h-auto min-h-[3rem] flex flex-col gap-2 shadow-lg transition-all ${
          message.proposalId
            ? "border-2 border-[#F3CFC6] bg-gradient-to-br from-white to-[#FCF0ED]/50 dark:from-gray-800 dark:to-gray-700"
            : isSender
              ? "bg-gradient-to-br from-[#D8A7B1] to-[#F3CFC6] text-white"
              : "bg-gradient-to-br from-[#FCF0ED] to-[#F3CFC6]/50 text-black"
        }`}
      >
        {/* Clickable Avatar + Name */}
        {!isSender && (
          <Link
            href={profileHref}
            className="flex items-center gap-2 -ml-1 -mt-1 mb-2 group"
          >
            <Avatar className="h-8 w-8 ring-2 ring-white/70 group-hover:ring-[#F3CFC6] transition-all">
              <AvatarImage
                src={message.sender.profileImage || undefined}
                alt={message.sender.name || "User"}
              />
              <AvatarFallback className="text-xs bg-gray-300">
                {message.sender.name?.[0]?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs font-semibold opacity-80 group-hover:underline group-hover:opacity-100 transition-all">
              {message.sender.name || "Unknown User"}{" "}
              {message.sender.isProfessional ? "(Pro)" : ""}
            </span>
          </Link>
        )}

        {/* Message Content */}
        {message.isAudio ? (
          <div className="flex items-center gap-2">
            <span>Audio Message</span>
          </div>
        ) : message.imageUrl ? (
          <div className="relative w-full max-w-xs h-64 rounded-lg overflow-hidden">
            <Image
              src={message.imageUrl}
              alt={`Image sent by ${message.sender.name || "user"}`}
              fill
              className="object-cover"
              onError={() => toast.error("Failed to load image")}
            />
          </div>
        ) : (
          <>
            <p className="break-words text-sm font-medium leading-relaxed">
              {message.text}
            </p>

            {/* Proposal / Request Controls */}
            {message.proposalId && (
              <div className="mt-3 pt-3 border-t border-white/20">
                {isSender || message.proposalStatus !== "pending" ? (
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-bold ${
                        message.proposalStatus === "accepted"
                          ? "text-green-600"
                          : message.proposalStatus === "rejected"
                            ? "text-red-600"
                            : "text-gray-500"
                      }`}
                    >
                      {message.proposalStatus === "accepted"
                        ? message.initiator === "user"
                          ? "Request Accepted"
                          : "Proposal Accepted"
                        : message.proposalStatus === "rejected"
                          ? message.initiator === "user"
                            ? "Request Declined"
                            : "Proposal Rejected"
                          : "Pending..."}
                    </span>
                  </div>
                ) : (
                  <div className="flex gap-2 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleProposalAction(message.proposalId!, "accepted")
                      }
                      disabled={sending}
                      className="text-[#D8A7B1] border-[#D8A7B1] hover:bg-[#D8A7B1]/10 rounded-full text-xs px-4"
                    >
                      {message.initiator === "user"
                        ? "Accept Request"
                        : "Accept"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleProposalAction(message.proposalId!, "rejected")
                      }
                      disabled={sending}
                      className="text-red-600 border-red-600 hover:bg-red-600/10 rounded-full text-xs px-4"
                    >
                      {message.initiator === "user"
                        ? "Decline Request"
                        : "Reject"}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Timestamp & Chat Button */}
        <div className="flex items-center justify-between mt-2">
          <div className="text-xs opacity-70">
            {format(new Date(message.createdAt), "HH:mm")}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
