"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Search, Filter } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface User {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  profileImage?: string | null;
}

interface Conversation {
  id: string;
  user1?: User | null;
  user2?: User | null;
  lastMessage?: { text: string; createdAt: string } | null;
  messageCount: number;
  unreadCount: number;
}

interface ConversationsListProps {
  activeConversationId?: string;
}

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

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const ConversationsList: React.FC<ConversationsListProps> = ({
  activeConversationId,
}) => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [unreadFilter, setUnreadFilter] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConversations = async () => {
      if (status !== "authenticated") return;

      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/conversations", {
          cache: "no-store",
          credentials: "include",
        });

        if (!res.ok) {
          if (res.status === 401) {
            router.push("/login");
            return;
          }
          throw new Error(`Failed to fetch conversations: ${res.status}`);
        }

        const data = await res.json();
        setConversations(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Fetch conversations error:", err);
        setError("Failed to load conversations. Please try again.");
        toast.error("Failed to load conversations");
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [status, router]);

  // Real-time subscription for new message notifications
  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id || !supabase) return;

    const channel = supabase
      .channel("conversation-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `userid=eq.${session.user.id}`, // lowercase
        },
        (payload) => {
          const newNotification = payload.new as {
            id: string;
            type: string;
            content: string;
            timestamp: string;
            unread: boolean;
            relatedid: string; // lowercase
            senderid: string; // lowercase
            userid: string; // lowercase
          };

          // Only handle message notifications
          if (
            newNotification.type === "message" &&
            newNotification.senderid !== session.user.id &&
            newNotification.userid === session.user.id
          ) {
            // Update unread count for the conversation
            setConversations((prev) =>
              prev.map((conv) =>
                conv.id === newNotification.relatedid
                  ? { ...conv, unreadCount: conv.unreadCount + 1 }
                  : conv
              )
            );

            // Show toast notification
            toast.info(newNotification.content, {
              duration: 5000,
              action: {
                label: "View",
                onClick: () =>
                  router.push(
                    `/dashboard/messaging/${newNotification.relatedid}`
                  ),
              },
            });
          }
        }
      )
      .subscribe((status) => {
        console.log("Conversation notifications subscription:", status);
      });

    return () => {
      if (supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [status, session?.user?.id, router]);

  const handleConversationClick = async (convId: string) => {
    if (!/^[0-9a-fA-F]{24}$/.test(convId)) {
      toast.error("Invalid conversation ID");
      return;
    }

    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, unreadCount: 0 } : c))
    );

    try {
      const res = await fetch(`/api/conversations/${convId}/mark-read`, {
        method: "PATCH",
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Failed to mark as read");
      }
    } catch (err) {
      console.error("Mark as read error:", err);
      toast.error("Failed to mark conversation as read");
      setConversations((prev) =>
        prev.map((c) =>
          c.id === convId ? { ...c, unreadCount: c.unreadCount + 1 } : c
        )
      );
    }

    router.push(`/dashboard/messaging/${convId}`);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleUnreadFilterChange = (value: boolean) => {
    setUnreadFilter(value);
  };

  const filterConversations = (data: Conversation[]) =>
    data
      .filter((conv) => {
        const otherUser =
          conv.user1?.id === session?.user.id ? conv.user2 : conv.user1;
        const fullName = otherUser
          ? `${otherUser.firstName || ""} ${otherUser.lastName || ""}`.trim() ||
            "Unknown User"
          : "Unknown User";

        return searchQuery
          ? fullName.toLowerCase().includes(searchQuery.toLowerCase())
          : true;
      })
      .filter((conv) => (unreadFilter ? conv.unreadCount > 0 : true));

  const filteredConversations = filterConversations(conversations);

  if (status === "loading" || loading) {
    return (
      <motion.div
        className="p-4 space-y-6 max-w-7xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
          <CardHeader>
            <Skeleton className="h-8 w-48 bg-[#C4C4C4]/50" />
            <Skeleton className="h-4 w-64 mt-2 bg-[#C4C4C4]/50" />
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            <Skeleton className="h-10 w-full sm:w-2/3 bg-[#C4C4C4]/50" />
            <Skeleton className="h-10 w-full sm:w-1/3 bg-[#C4C4C4]/50" />
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader>
            <Skeleton className="h-8 w-48 bg-[#C4C4C4]/50" />
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-24 w-full bg-[#C4C4C4]/50 rounded-lg"
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  if (error) {
    return (
      <motion.div
        className="p-4 space-y-6 max-w-7xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
          <CardHeader>
            <motion.div variants={itemVariants}>
              <CardTitle className="text-2xl text-black dark:text-white">
                Your Conversations
              </CardTitle>
              <p className="text-sm opacity-80">Manage your conversations</p>
            </motion.div>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            <Skeleton className="h-10 w-full sm:w-2/3 bg-[#C4C4C4]/50" />
            <Skeleton className="h-10 w-full sm:w-1/3 bg-[#C4C4C4]/50" />
          </CardContent>
        </Card>
        <Card className="shadow-lg flex flex-col">
          <CardContent className="flex-1 flex items-center justify-center pt-6">
            <p className="text-red-500 text-sm">{error}</p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="p-4 space-y-6 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
        <CardHeader>
          <motion.div variants={itemVariants}>
            <CardTitle className="text-2xl font-bold text-black dark:text-white">
              Your Conversations
            </CardTitle>
            <p className="text-sm opacity-80">Manage your conversations</p>
          </motion.div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center mb-6 w-full space-y-2 sm:space-y-0 sm:space-x-2">
            <div className="relative flex-grow w-full">
              <Search className="absolute left-3 top-1/2 h-6 w-6 -translate-y-1/2 text-[#fff]" />
              <Input
                type="text"
                placeholder="Search by participant name..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="p-2 pl-10 rounded border-[#F3CFC6] text-black dark:text-white focus:ring-[#F3CFC6]"
              />
            </div>
            <div className="flex space-x-2 w-full sm:w-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex items-center space-x-2 text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20 w-full sm:w-auto"
                  >
                    <Filter className="h-6 w-6 text-[#F3CFC6]" />
                    <span>{unreadFilter ? "Unread" : "Filter"}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-white dark:bg-gray-800">
                  <DropdownMenuLabel className="text-black dark:text-white">
                    Filter Conversations
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleUnreadFilterChange(false)}
                    className="text-black dark:text-white hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20"
                  >
                    All
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleUnreadFilterChange(true)}
                    className="text-black dark:text-white hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20"
                  >
                    Unread Only
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg flex flex-col gap-0">
        <CardHeader>
          <CardTitle className="flex items-center text-black dark:text-white">
            <MessageSquare className="mr-2 h-6 w-6 text-[#F3CFC6]" />
            All Conversations
            {filteredConversations.length > 0 && (
              <span className="ml-2 text-sm font-normal text-[#C4C4C4]">
                ({filteredConversations.length})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-2 sm:p-4 pt-0">
          <AnimatePresence>
            {filteredConversations.length === 0 ? (
              <motion.div
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                className="flex h-full items-center justify-center py-12"
              >
                <div className="text-center">
                  <MessageSquare className="h-12 w-12 text-[#C4C4C4] mx-auto mb-4" />
                  <p className="text-[#C4C4C4] text-sm">
                    No conversations found.
                  </p>
                  {(searchQuery || unreadFilter) && (
                    <Button
                      variant="link"
                      onClick={() => {
                        setSearchQuery("");
                        setUnreadFilter(false);
                      }}
                      className="text-[#F3CFC6] mt-2"
                    >
                      Clear filters
                    </Button>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                className="divide-y divide-[#F3CFC6]/20 flex flex-col gap-2 rounded-lg"
                variants={containerVariants}
              >
                {filteredConversations.map((conv) => {
                  const otherParticipant =
                    conv.user1?.id === session?.user.id
                      ? conv.user2
                      : conv.user1;
                  const name = otherParticipant
                    ? `${otherParticipant.firstName || ""} ${otherParticipant.lastName || ""}`.trim() ||
                      "Unknown User"
                    : "Unknown User";
                  const isActive =
                    conv.id === activeConversationId ||
                    pathname === `/dashboard/messaging/${conv.id}`;
                  const isUnread = conv.unreadCount > 0;

                  return (
                    <motion.div
                      key={conv.id}
                      variants={cardVariants}
                      whileHover={{
                        scale: 1.0,
                      }}
                      transition={{ duration: 0.2 }}
                    >
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-full flex items-center gap-2 sm:gap-3 p-2 sm:p-4 rounded-md h-auto",
                          isActive
                            ? "bg-[#F3CFC6]/20 text-black dark:text-white"
                            : isUnread
                              ? "bg-[#F3CFC6]/30 text-black dark:text-white"
                              : "bg-[#C4C4C4]/10 hover:bg-[#F3CFC6]/10 dark:hover:bg-[#C4C4C4]/10 text-black dark:text-white"
                        )}
                        onClick={() => handleConversationClick(conv.id)}
                      >
                        <div className="flex-1 text-left min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold truncate text-sm sm:text-base text-black dark:text-white">
                              {name}
                            </span>
                            {conv.lastMessage && (
                              <span className="text-xs text-[#C4C4C4] whitespace-nowrap">
                                {new Date(
                                  conv.lastMessage.createdAt
                                ).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm text-[#C4C4C4] truncate">
                            {conv.lastMessage?.text || "No messages"}
                          </p>
                        </div>
                        {conv.unreadCount > 0 && (
                          <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[24px] text-center">
                            {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                          </span>
                        )}
                      </Button>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ConversationsList;
