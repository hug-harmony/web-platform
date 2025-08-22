import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CardHeader } from "@/components/ui/card";

interface Participant {
  id: string;
  firstName?: string;
  lastName?: string;
  profileImage?: string;
}

interface ChatHeaderProps {
  otherUser: Participant | undefined;
  sessionUserId: string;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ otherUser }) => {
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
    <CardHeader className="p-4 border-b flex flex-row justify-between items-center bg-gradient-to-r from-[#F3CFC6]/20 to-[#FCF0ED]/20">
      <div className="flex items-center space-x-2">
        <Avatar className="w-10 h-10">
          <AvatarImage src={profileImage} alt={otherUserName} />
          <AvatarFallback className="bg-purple-500 text-white">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="space-y-2">
          <p className="font-semibold h-4">{otherUserName}</p>
          <p className="text-xs text-gray-500 h-3">Online</p>
        </div>
      </div>
    </CardHeader>
  );
};

export default ChatHeader;
