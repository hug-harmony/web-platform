// components/chat/ConversationsList.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Search, Filter, RefreshCw } from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Conversation } from "@/types/chat";

interface ConversationsListProps {
  activeConversationId?: string;
}

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

const ConversationsList: React.FC<ConversationsListProps> = ({
  activeConversationId,
}) => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [unreadFilter, setUnreadFilter] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // WebSocket for real-time updates
  useWebSocket({
    enabled: status === "authenticated",
    onNewMessage: useCallback(
      (message) => {
        // Update the conversation's last message and unread count
        setConversations((prev) =>
          prev.map((conv) => {
            if (conv.id === message.conversationId) {
              const isCurrentConversation =
                pathname === `/dashboard/messaging/${conv.id}`;
              return {
                ...conv,
                lastMessage: {
                  id: message.id,
                  text: message.text,
                  createdAt: message.createdAt,
                  senderId: message.senderId,
                },
                unreadCount: isCurrentConversation
                  ? conv.unreadCount
                  : (conv.unreadCount || 0) + 1,
              };
            }
            return conv;
          })
        );
      },
      [pathname]
    ),
  });

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (status !== "authenticated") return;

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
      setError(null);
    } catch (err) {
      console.error("Fetch conversations error:", err);
      setError("Failed to load conversations. Please try again.");
      toast.error("Failed to load conversations");
    }
  }, [status, router]);

  // Initial fetch
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchConversations();
      setLoading(false);
    };
    load();
  }, [fetchConversations]);

  // Refresh function
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchConversations();
    setRefreshing(false);
    toast.success("Conversations refreshed");
  };

  // Handle conversation click
  const handleConversationClick = async (convId: string) => {
    if (!/^[0-9a-fA-F]{24}$/.test(convId)) {
      toast.error("Invalid conversation ID");
      return;
    }

    // Optimistically clear unread count
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, unreadCount: 0 } : c))
    );

    // Mark as read in background
    fetch(`/api/conversations/${convId}`, {
      method: "PATCH",
      credentials: "include",
    }).catch(console.error);

    router.push(`/dashboard/messaging/${convId}`);
  };

  // Filter conversations
  const filteredConversations = conversations
    .filter((conv) => {
      if (!searchQuery) return true;

      const otherUser =
        conv.user1?.id === session?.user?.id ? conv.user2 : conv.user1;
      const fullName = otherUser
        ? `${otherUser.firstName || ""} ${otherUser.lastName || ""}`.trim()
        : "";

      return fullName.toLowerCase().includes(searchQuery.toLowerCase());
    })
    .filter((conv) => (unreadFilter ? (conv.unreadCount || 0) > 0 : true));

  // Loading state
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
            <Skeleton className="h-8 w-48 bg-white/50" />
            <Skeleton className="h-4 w-64 mt-2 bg-white/50" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-full bg-white/50" />
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardContent className="space-y-4 pt-6">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full bg-[#C4C4C4]/20" />
            ))}
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  return (
    <motion.div
      className="p-4 space-y-6 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header card */}
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
        <CardHeader>
          <motion.div variants={itemVariants}>
            <CardTitle className="text-2xl font-bold text-black dark:text-white">
              Your Messages
            </CardTitle>
            <p className="text-sm opacity-80">Manage your conversations</p>
          </motion.div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Search input */}
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/80 border-white/50 focus:border-[#F3CFC6]"
              />
            </div>

            {/* Filter dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="flex items-center gap-2 bg-white/80 border-white/50"
                >
                  <Filter className="h-4 w-4" />
                  {unreadFilter ? "Unread" : "All"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Filter</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setUnreadFilter(false)}>
                  All Messages
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setUnreadFilter(true)}>
                  Unread Only
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Refresh button */}
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={refreshing}
              className="bg-white/80 border-white/50"
            >
              <RefreshCw
                className={cn("h-4 w-4", refreshing && "animate-spin")}
              />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Conversations list */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-black dark:text-white">
            <MessageSquare className="mr-2 h-6 w-6 text-[#F3CFC6]" />
            Conversations
            {filteredConversations.length > 0 && (
              <span className="ml-2 text-sm font-normal text-[#C4C4C4]">
                ({filteredConversations.length})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 sm:p-4">
          {error ? (
            <div className="text-center py-8">
              <p className="text-red-500 text-sm mb-4">{error}</p>
              <Button onClick={fetchConversations} variant="outline">
                Try Again
              </Button>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {filteredConversations.length === 0 ? (
                <motion.div
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                  className="flex flex-col items-center justify-center py-12"
                >
                  <MessageSquare className="h-12 w-12 text-[#C4C4C4] mb-4" />
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
                </motion.div>
              ) : (
                <div className="space-y-2">
                  {filteredConversations.map((conv) => {
                    const otherUser =
                      conv.user1?.id === session?.user?.id
                        ? conv.user2
                        : conv.user1;
                    const name = otherUser
                      ? `${otherUser.firstName || ""} ${otherUser.lastName || ""}`.trim() ||
                        "Unknown User"
                      : "Unknown User";
                    const isActive =
                      conv.id === activeConversationId ||
                      pathname === `/dashboard/messaging/${conv.id}`;
                    const hasUnread = (conv.unreadCount || 0) > 0;

                    return (
                      <motion.div
                        key={conv.id}
                        variants={itemVariants}
                        layout
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                      >
                        <Button
                          variant="ghost"
                          className={cn(
                            "w-full flex items-center gap-3 p-4 rounded-lg h-auto justify-start",
                            isActive
                              ? "bg-[#F3CFC6]/30"
                              : hasUnread
                                ? "bg-[#F3CFC6]/20"
                                : "bg-transparent hover:bg-[#F3CFC6]/10"
                          )}
                          onClick={() => handleConversationClick(conv.id)}
                        >
                          {/* Avatar placeholder */}
                          <div className="w-12 h-12 rounded-full bg-[#F3CFC6] flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-semibold">
                              {name.charAt(0).toUpperCase()}
                            </span>
                          </div>

                          {/* Content */}
                          <div className="flex-1 text-left min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={cn(
                                  "font-semibold truncate",
                                  hasUnread && "text-black dark:text-white"
                                )}
                              >
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
                            <p
                              className={cn(
                                "text-sm truncate",
                                hasUnread
                                  ? "text-black dark:text-white font-medium"
                                  : "text-[#C4C4C4]"
                              )}
                            >
                              {conv.lastMessage?.text || "No messages yet"}
                            </p>
                          </div>

                          {/* Unread badge */}
                          {hasUnread && (
                            <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[24px] text-center flex-shrink-0">
                              {conv.unreadCount! > 99
                                ? "99+"
                                : conv.unreadCount}
                            </span>
                          )}
                        </Button>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </AnimatePresence>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ConversationsList;
