// src/app/admin/dashboard/messaging/[id]/page.tsx
"use client";

import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MessageCircle,
  ArrowLeft,
  Search,
  Calendar,
  AlertCircle,
  MoreVertical,
  User,
  X,
  Loader2,
  ChevronUp,
  UserX,
  UserCheck,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/useDebounce";
import { formatDistanceToNow, format } from "date-fns";
import MessageBubble from "@/components/chat/MessageBubble";
import type { ChatMessage } from "@/types/chat";

interface ConversationUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  profileImage?: string;
  status: string;
  isSuspended: boolean;
  reportCount: number;
  createdAt: string;
}

interface Conversation {
  id: string;
  user1: ConversationUser;
  user2: ConversationUser;
  createdAt: string;
  updatedAt: string;
}

interface ApiMessage {
  id: string;
  text: string;
  imageUrl?: string;
  createdAt: string;
  senderId: string;
  userId: string;
  isAudio: boolean;
  isSystem?: boolean;
  proposalId?: string;
  proposalStatus?: string;
  initiator?: "user" | "professional";
  sender: {
    id?: string;
    name: string;
    profileImage?: string | null;
    isSuspended?: boolean;
  };
}

interface SearchResult {
  id: string;
  text: string;
  createdAt: string;
  senderId: string;
  sender: {
    id?: string;
    name: string;
    profileImage?: string | null;
  };
  highlightedText: string;
}

type FilterType = "all" | "today" | "week" | "month";
type ActionType = "suspend" | "activate" | null;

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

function toChatMessage(msg: ApiMessage, conversationId: string): ChatMessage {
  return {
    id: msg.id,
    text: msg.text,
    imageUrl: msg.imageUrl || null,
    createdAt: msg.createdAt,
    senderId: msg.senderId,
    userId: msg.userId,
    isAudio: msg.isAudio,
    isSystem: msg.isSystem,
    proposalId: msg.proposalId || null,
    proposalStatus: msg.proposalStatus || null,
    initiator: msg.initiator || null,
    conversationId,
    sender: {
      name: msg.sender?.name || "Unknown",
      profileImage: msg.sender?.profileImage || null,
      isProfessional: false,
      userId: msg.sender?.id || null,
    },
  };
}

export default function ConversationDetailPage() {
  const { id } = useParams();
  const scrollRef = useRef<HTMLDivElement>(null);

  // State
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Filters
  const [filter, setFilter] = useState<FilterType>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Actions
  const [actionType, setActionType] = useState<ActionType>(null);
  const [targetUser, setTargetUser] = useState<ConversationUser | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Pagination
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const debouncedSearch = useDebounce(searchTerm, 300);

  // Fetch conversation details
  const fetchConversation = useCallback(async () => {
    if (!id) return;

    try {
      const response = await fetch(`/api/admin/conversations/${id}`);
      if (!response.ok) throw new Error("Failed to fetch conversation");
      const data = await response.json();
      setConversation(data);
    } catch (error) {
      console.error("Error fetching conversation:", error);
      toast.error("Failed to load conversation");
    }
  }, [id]);

  // Fetch messages
  const fetchMessages = useCallback(
    async (cursor?: string) => {
      if (!id) return;

      try {
        if (cursor) {
          setLoadingMore(true);
        } else {
          setLoading(true);
        }

        const params = new URLSearchParams({ limit: "50" });
        if (filter !== "all") params.set("filter", filter);
        if (cursor) params.set("cursor", cursor);

        const response = await fetch(
          `/api/admin/conversations/${id}/messages?${params}`
        );
        if (!response.ok) throw new Error("Failed to fetch messages");

        const data = await response.json();

        if (cursor) {
          setMessages((prev) => [
            ...data.messages.map((m: ApiMessage) =>
              toChatMessage(m, id as string)
            ),
            ...prev,
          ]);
        } else {
          setMessages(
            data.messages.map((m: ApiMessage) => toChatMessage(m, id as string))
          );
        }

        setHasMore(data.pagination.hasMore);
        setNextCursor(data.pagination.nextCursor);
      } catch (error) {
        console.error("Error fetching messages:", error);
        toast.error("Failed to load messages");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [id, filter]
  );

  // Search messages
  const searchMessages = useCallback(async () => {
    if (!id || !debouncedSearch || debouncedSearch.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    try {
      setIsSearching(true);
      const response = await fetch(
        `/api/admin/conversations/${id}/messages/search?q=${encodeURIComponent(debouncedSearch)}`
      );
      if (!response.ok) throw new Error("Search failed");

      const data = await response.json();
      setSearchResults(data.results);
      setShowSearchResults(true);
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Search failed");
    } finally {
      setIsSearching(false);
    }
  }, [id, debouncedSearch]);

  // Handle user action (suspend/activate)
  const handleUserAction = async () => {
    if (!targetUser || !actionType) return;

    try {
      setActionLoading(true);

      const response = await fetch(`/api/admin/users/${targetUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: actionType === "suspend" ? "suspended" : "active",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Action failed");
      }

      toast.success(
        actionType === "suspend"
          ? "User suspended successfully"
          : "User activated successfully"
      );

      // Refresh conversation data
      fetchConversation();

      // Close dialog
      setActionType(null);
      setTargetUser(null);
    } catch (error) {
      console.error("Action error:", error);
      toast.error(error instanceof Error ? error.message : "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  // Scroll to message
  const scrollToMessage = (messageId: string) => {
    const element = document.getElementById(`message-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.classList.add("bg-yellow-200/30");
      setTimeout(() => element.classList.remove("bg-yellow-200/30"), 2000);
    }
    setShowSearchResults(false);
  };

  // Effects
  useEffect(() => {
    fetchConversation();
    fetchMessages();
  }, [fetchConversation, fetchMessages]);

  useEffect(() => {
    searchMessages();
  }, [searchMessages]);

  // Reset messages when filter changes
  useEffect(() => {
    setNextCursor(null);
    fetchMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  // User action menu component
  const UserActionMenu = ({ user }: { user: ConversationUser }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/admin/dashboard/users/${user.id}`}>
            <User className="h-4 w-4 mr-2" />
            View Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {user.isSuspended ? (
          <DropdownMenuItem
            onClick={() => {
              setTargetUser(user);
              setActionType("activate");
            }}
            className="text-green-600"
          >
            <UserCheck className="h-4 w-4 mr-2" />
            Activate User
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            onClick={() => {
              setTargetUser(user);
              setActionType("suspend");
            }}
            className="text-red-600"
          >
            <UserX className="h-4 w-4 mr-2" />
            Suspend User
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // User card component
  const UserCard = ({
    user,
    label,
  }: {
    user: ConversationUser;
    label: string;
  }) => (
    <div className="flex items-start justify-between p-4 bg-white/50 dark:bg-black/20 rounded-lg">
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 rounded-full bg-[#F3CFC6]/30 flex items-center justify-center overflow-hidden">
          {user.profileImage ? (
            <Image
              src={user.profileImage}
              alt={`${user.firstName} ${user.lastName}`}
              width={48}
              height={48}
              className="h-12 w-12 rounded-full object-cover"
            />
          ) : (
            <User className="h-6 w-6 text-[#C4C4C4]" />
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-semibold text-black dark:text-white">
              {user.firstName} {user.lastName}
            </p>
            <Badge variant="outline" className="text-xs">
              {label}
            </Badge>
          </div>
          <p className="text-sm text-[#C4C4C4]">{user.email}</p>
          <div className="flex items-center gap-2 mt-1">
            {user.isSuspended && (
              <Badge variant="destructive" className="text-xs">
                <AlertCircle className="h-3 w-3 mr-1" />
                Suspended
              </Badge>
            )}
            {user.reportCount > 0 && (
              <Badge
                variant="secondary"
                className="text-xs bg-yellow-500/20 text-yellow-600"
              >
                {user.reportCount} Report{user.reportCount > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
          <p className="text-xs text-[#C4C4C4] mt-1">
            Joined{" "}
            {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
          </p>
        </div>
      </div>
      <UserActionMenu user={user} />
    </div>
  );

  // Handle proposal action (disabled for admin)
  const handleProposalAction = async (): Promise<void> => {
    toast.info("Proposal actions are not available in admin view");
  };

  if (loading && !conversation) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#F3CFC6]" />
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="p-8 text-center">
        <MessageCircle className="h-16 w-16 mx-auto mb-4 text-[#C4C4C4] opacity-50" />
        <p className="text-[#C4C4C4]">Conversation not found</p>
        <Button asChild variant="link" className="mt-4 text-[#F3CFC6]">
          <Link href="/admin/dashboard/messaging">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Conversations
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[#C4C4C4]">
        <Link
          href="/admin/dashboard/messaging"
          className="hover:text-[#F3CFC6] transition-colors"
        >
          Conversations
        </Link>
        <span>/</span>
        <span className="truncate max-w-[200px]">
          {conversation.user1.firstName} & {conversation.user2.firstName}
        </span>
      </div>

      {/* Users Summary */}
      <Card className="bg-gradient-to-r from-[#F3CFC6]/20 to-[#C4C4C4]/20">
        <CardHeader>
          <CardTitle className="flex items-center text-xl font-bold">
            <MessageCircle className="mr-2 h-5 w-5" />
            Conversation Participants
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UserCard user={conversation.user1} label="User 1" />
            <UserCard user={conversation.user2} label="User 2" />
          </div>
        </CardContent>
      </Card>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#C4C4C4]" />
          <Input
            placeholder="Search in messages..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-10 border-[#C4C4C4] focus:ring-[#F3CFC6]"
            aria-label="Search messages"
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm("");
                setShowSearchResults(false);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="h-4 w-4 text-[#C4C4C4] hover:text-black" />
            </button>
          )}
          {isSearching && (
            <Loader2 className="absolute right-10 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-[#F3CFC6]" />
          )}

          {/* Search Results Dropdown */}
          {showSearchResults && searchResults.length > 0 && (
            <Card className="absolute top-full left-0 right-0 mt-1 z-50 max-h-[300px] overflow-y-auto shadow-lg">
              <CardContent className="p-2">
                <div className="flex items-center justify-between p-2 border-b">
                  <span className="text-sm font-medium">
                    {searchResults.length} result
                    {searchResults.length > 1 ? "s" : ""} found
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSearchResults(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {searchResults.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => scrollToMessage(result.id)}
                    className="w-full text-left p-3 hover:bg-[#F3CFC6]/10 rounded-md transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">
                        {result.sender.name}
                      </span>
                      <span className="text-xs text-[#C4C4C4]">
                        {format(new Date(result.createdAt), "MMM d, h:mm a")}
                      </span>
                    </div>
                    <p
                      className="text-sm text-[#C4C4C4] line-clamp-2"
                      dangerouslySetInnerHTML={{
                        __html: result.highlightedText.replace(
                          /\*\*(.*?)\*\*/g,
                          '<mark class="bg-yellow-200 px-0.5 rounded">$1</mark>'
                        ),
                      }}
                    />
                  </button>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Time Filter */}
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-[#C4C4C4]" />
          <Select
            value={filter}
            onValueChange={(value) => setFilter(value as FilterType)}
          >
            <SelectTrigger className="w-[150px] border-[#C4C4C4]">
              <SelectValue placeholder="Filter by time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Messages */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]" ref={scrollRef}>
            <div className="p-4 space-y-2">
              {/* Load More Button */}
              {hasMore && (
                <div className="flex justify-center pb-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchMessages(nextCursor || undefined)}
                    disabled={loadingMore}
                    className="border-[#C4C4C4]"
                  >
                    {loadingMore ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <ChevronUp className="h-4 w-4 mr-2" />
                    )}
                    Load earlier messages
                  </Button>
                </div>
              )}

              <AnimatePresence mode="popLayout">
                {loading ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin text-[#F3CFC6]" />
                  </div>
                ) : messages.length > 0 ? (
                  messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      id={`message-${msg.id}`}
                      variants={itemVariants}
                      className="transition-colors duration-500"
                    >
                      <div className="relative group">
                        <MessageBubble
                          message={msg}
                          isSender={false}
                          handleProposalAction={handleProposalAction}
                          sending={false}
                          onEdit={() => {}}
                          onDelete={() => {}}
                        />
                        {/* Admin indicator for sender */}
                        <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Badge variant="outline" className="text-xs">
                            {msg.senderId === conversation.user1.id
                              ? `${conversation.user1.firstName}`
                              : `${conversation.user2.firstName}`}
                          </Badge>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="p-8 text-center text-[#C4C4C4]">
                    <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No messages found</p>
                    {filter !== "all" && (
                      <Button
                        variant="link"
                        onClick={() => setFilter("all")}
                        className="mt-2 text-[#F3CFC6]"
                      >
                        Clear filter
                      </Button>
                    )}
                  </div>
                )}
              </AnimatePresence>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Back Button */}
      <Button
        asChild
        variant="link"
        className="text-[#F3CFC6] hover:text-[#F3CFC6]/80"
      >
        <Link href="/admin/dashboard/messaging">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Conversations
        </Link>
      </Button>

      {/* Action Dialog */}
      <Dialog
        open={actionType !== null}
        onOpenChange={(open) => {
          if (!open) {
            setActionType(null);
            setTargetUser(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "suspend" && "Suspend User"}
              {actionType === "activate" && "Activate User"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "suspend" && (
                <>
                  Are you sure you want to suspend{" "}
                  <strong>
                    {targetUser?.firstName} {targetUser?.lastName}
                  </strong>
                  ? They will no longer be able to access the platform.
                </>
              )}
              {actionType === "activate" && (
                <>
                  Are you sure you want to activate{" "}
                  <strong>
                    {targetUser?.firstName} {targetUser?.lastName}
                  </strong>
                  ? They will regain access to the platform.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setActionType(null);
                setTargetUser(null);
              }}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUserAction}
              disabled={actionLoading}
              variant={actionType === "activate" ? "default" : "destructive"}
            >
              {actionLoading && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              {actionType === "suspend" && "Suspend User"}
              {actionType === "activate" && "Activate User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
