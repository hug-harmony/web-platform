// components/chat/ChatHeader.tsx
import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Notebook, Wifi, WifiOff } from "lucide-react";
import { formatLastOnline } from "@/lib/formatLastOnline";
import { cn } from "@/lib/utils";
import type { Participant } from "@/types/chat";

interface ChatHeaderProps {
  otherUser: Participant | undefined;
  sessionUserId: string;
  onNotesClick: () => void;
  isConnected?: boolean;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  otherUser,
  onNotesClick,
  isConnected = true,
}) => {
  const otherUserName = otherUser
    ? `${otherUser.firstName || ""} ${otherUser.lastName || ""}`.trim() ||
      "Unknown User"
    : "Unknown User";

  const profileImage = otherUser?.profileImage;

  const initials = otherUserName
    .split(" ")
    .map((n) => n.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const lastOnlineDate = otherUser?.lastOnline
    ? new Date(otherUser.lastOnline)
    : null;

  const { text: statusText, isOnline } = formatLastOnline(lastOnlineDate);

  return (
    <CardHeader className="p-4 sm:p-6 border-b bg-[#F3CFC6]/20 dark:bg-[#C4C4C4]/20 flex flex-row items-center justify-between space-x-2">
      <div className="flex items-center space-x-3">
        <div className="relative">
          <Avatar className="h-10 w-10 border-2 border-white">
            <AvatarImage
              src={profileImage || "/assets/images/avatar-placeholder.png"}
              alt={otherUserName}
            />
            <AvatarFallback className="bg-[#C4C4C4] text-black">
              {initials}
            </AvatarFallback>
          </Avatar>
          {/* Online indicator dot */}
          <div
            className={cn(
              "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white",
              isOnline ? "bg-green-500" : "bg-gray-400"
            )}
          />
        </div>
        <div className="flex flex-col">
          <p className="font-semibold text-black dark:text-white">
            {otherUserName}
          </p>
          <p className="text-xs text-[#C4C4C4]">{statusText}</p>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {/* Connection status indicator */}
        <div
          className={cn(
            "flex items-center space-x-1 px-2 py-1 rounded-full text-xs",
            isConnected
              ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
              : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400"
          )}
        >
          {isConnected ? (
            <>
              <Wifi className="h-3 w-3" />
              <span className="hidden sm:inline">Live</span>
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3" />
              <span className="hidden sm:inline">Reconnecting...</span>
            </>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onNotesClick}
          className="text-[#000] hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20"
        >
          <Notebook className="h-5 w-5 mr-1" />
          <span className="hidden sm:inline">Notes</span>
        </Button>
      </div>
    </CardHeader>
  );
};

export default ChatHeader;
