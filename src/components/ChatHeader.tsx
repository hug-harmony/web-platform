import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Notebook } from "lucide-react";

interface Participant {
  id: string;
  firstName?: string;
  lastName?: string;
  profileImage?: string;
}

interface ChatHeaderProps {
  otherUser: Participant | undefined;
  sessionUserId: string;
  onNotesClick: () => void; // Added for notes sidebar toggle
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ otherUser, onNotesClick }) => {
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

  return (
    <CardHeader className="p-4 sm:p-6 border-b bg-[#F3CFC6]/20 dark:bg-[#C4C4C4]/20 flex items-center justify-between space-x-2">
      <div className="flex items-center space-x-2">
        <Avatar className="h-10 w-10 border-2 border-white">
          <AvatarImage
            src={profileImage || "/assets/images/avatar-placeholder.png"}
            alt={otherUserName}
          />
          <AvatarFallback className="bg-[#C4C4C4] text-black">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold text-black dark:text-white">
            {otherUserName}
          </p>
          <p className="text-xs text-[#C4C4C4]">Online</p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={onNotesClick}
        className="text-[#F3CFC6] hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20"
      >
        <Notebook className="h-5 w-5" />
      </Button>
    </CardHeader>
  );
};

export default ChatHeader;
