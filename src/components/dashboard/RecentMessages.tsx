// src/components/dashboard/RecentMessages.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare } from "lucide-react";
import type { Conversation, ConversationUser } from "@/types/dashboard";

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, staggerChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

function getParticipantName(user: ConversationUser | null): string {
  if (!user) return "Unknown User";
  const firstName = user.firstName || "";
  const lastName = user.lastName || "";
  const fullName = `${firstName} ${lastName}`.trim();
  return fullName || "Unknown User";
}

function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

interface RecentMessagesProps {
  conversations: Conversation[];
  currentUserId: string;
}

export function RecentMessages({
  conversations,
  currentUserId,
}: RecentMessagesProps) {
  const router = useRouter();

  const getOtherParticipant = (conv: Conversation) => {
    if (conv.user1?.id === currentUserId) {
      return conv.user2;
    }
    return conv.user1;
  };

  const handleConversationClick = (convId: string) => {
    if (!/^[0-9a-fA-F]{24}$/.test(convId)) {
      toast.error("Invalid conversation ID");
      return;
    }
    router.push(`/dashboard/messaging/${convId}`);
  };

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-black dark:text-white">
          <MessageSquare className="mr-2 h-6 w-6 text-[#F3CFC6]" />
          Recent Messages
          {totalUnread > 0 && (
            <Badge variant="destructive" className="ml-2">
              {totalUnread} new
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[200px]">
          <motion.div className="space-y-2" variants={containerVariants}>
            <AnimatePresence>
              {conversations.length > 0 ? (
                conversations.slice(0, 5).map((conv) => {
                  const otherUser = getOtherParticipant(conv);
                  const name = getParticipantName(otherUser);
                  const hasUnread = conv.unreadCount > 0;

                  return (
                    <motion.div
                      key={conv.id}
                      variants={itemVariants}
                      initial="hidden"
                      animate="visible"
                      exit={{ opacity: 0, x: -20 }}
                      className={`flex items-center justify-between p-3 rounded-md cursor-pointer transition-colors ${
                        hasUnread
                          ? "bg-[#F3CFC6]/20 hover:bg-[#F3CFC6]/30"
                          : "hover:bg-[#F3CFC6]/10 dark:hover:bg-[#C4C4C4]/10"
                      }`}
                      onClick={() => handleConversationClick(conv.id)}
                    >
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            <AvatarImage
                              src={otherUser?.profileImage || ""}
                              alt={name}
                            />
                            <AvatarFallback className="bg-[#C4C4C4] text-black">
                              {name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {hasUnread && (
                            <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center text-xs text-white">
                              {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`font-semibold text-black dark:text-white truncate ${
                              hasUnread ? "font-bold" : ""
                            }`}
                          >
                            {name}
                          </p>
                          <p className="text-sm text-[#C4C4C4] truncate">
                            {conv.lastMessage?.text || "No messages yet"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <p className="text-xs text-[#C4C4C4]">
                          {conv.lastMessage
                            ? getRelativeTime(conv.lastMessage.createdAt)
                            : ""}
                        </p>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 text-[#C4C4C4] mx-auto mb-2" />
                  <p className="text-[#C4C4C4]">No messages yet.</p>
                  <Button asChild variant="link" className="text-[#F3CFC6]">
                    <Link href="/dashboard/professionals">
                      Find someone to chat with
                    </Link>
                  </Button>
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        </ScrollArea>
        {conversations.length > 0 && (
          <Button asChild variant="link" className="mt-4 text-[#F3CFC6]">
            <Link href="/dashboard/messaging">View All Messages</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
