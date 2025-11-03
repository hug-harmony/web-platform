import React from "react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { format } from "date-fns";
import { toast } from "sonner";

interface Message {
  senderId: string;
  id: string;
  text: string;
  isAudio: boolean;
  imageUrl?: string;
  createdAt: string;
  sender: { name?: string };
  userId: string;
  proposalId?: string;
  proposalStatus?: string;
  initiator?: string; // NEW: To distinguish request vs. proposal
}

interface MessageBubbleProps {
  message: Message;
  isSender: boolean;
  handleProposalAction: (
    proposalId: string,
    action: "accepted" | "rejected"
  ) => Promise<void>;
  sending: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isSender,
  handleProposalAction,
  sending,
}) => {
  // Debug proposalStatus (unchanged)
  console.log("MessageBubble:", {
    messageId: message.id,
    proposalId: message.proposalId,
    proposalStatus: message.proposalStatus,
    isSender,
  });

  return (
    <div className={`flex ${isSender ? "justify-end" : "justify-start"}`}>
      <div
        className={`p-4 rounded-xl max-w-xs h-auto min-h-[3rem] flex flex-col gap-2 shadow-lg ${
          message.proposalId
            ? "border-2 border-[#F3CFC6] bg-gradient-to-br from-white to-[#FCF0ED]/50 dark:from-gray-800 dark:to-gray-700"
            : isSender
              ? "bg-gradient-to-br from-[#D8A7B1] to-[#F3CFC6] text-white"
              : "bg-gradient-to-br from-[#FCF0ED] to-[#F3CFC6]/50 text-black"
        }`}
      >
        {message.isAudio ? (
          <div className="flex items-center">
            <span>🎵 Audio</span>
          </div>
        ) : message.imageUrl ? (
          <div className="relative w-full max-w-xs h-48">
            <Image
              src={message.imageUrl}
              alt={`Image sent by ${message.sender.name || "user"} at ${format(new Date(message.createdAt), "HH:mm")}`}
              width={200}
              height={200}
              className="rounded-lg object-cover"
              priority={false}
              onError={() => toast.error("Failed to load image")}
            />
          </div>
        ) : (
          <>
            <span className="break-words text-sm font-medium">
              {message.text}
            </span>
            {message.proposalId && (
              <div className="mt-3">
                {isSender ||
                (message.proposalStatus &&
                  message.proposalStatus !== "pending") ? (
                  <span
                    className={`text-sm font-semibold ${
                      message.proposalStatus === "accepted"
                        ? "text-green-500"
                        : message.proposalStatus === "rejected"
                          ? "text-red-500"
                          : "text-gray-500"
                    }`}
                  >
                    {/* UPDATED: Tailored status text based on initiator */}
                    {message.proposalStatus === "accepted"
                      ? message.initiator === "user"
                        ? "Request Accepted"
                        : "Proposal Accepted"
                      : message.proposalStatus === "rejected"
                        ? message.initiator === "user"
                          ? "Request Declined"
                          : "Proposal Rejected"
                        : "Pending"}
                  </span>
                ) : (
                  <div className="flex space-x-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleProposalAction(message.proposalId!, "accepted")
                      }
                      disabled={sending}
                      className="text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#F3CFC6]/20 rounded-full px-4"
                    >
                      {/* UPDATED: Dynamic button text */}
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
                      className="text-red-500 border-red-500 hover:bg-red-500/20 rounded-full px-4"
                    >
                      {/* UPDATED: Dynamic button text */}
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
        <div className="text-xs text-gray-400 mt-2">
          {format(new Date(message.createdAt), "HH:mm")}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
