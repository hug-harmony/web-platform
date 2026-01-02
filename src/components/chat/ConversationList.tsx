// src/components/chat/ConversationsList.tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  PanInfo,
} from "framer-motion";
import {
  MessageSquare,
  Plus,
  Pin,
  Archive,
  Trash2,
  MoreVertical,
  Check,
  CheckCheck,
  Image as ImageIcon,
  Mic,
} from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TooltipProvider } from "@/components/ui/tooltip";
import ProfilePreviewDialog, { ProfileUser } from "./ProfilePreviewDialog";
import ConversationsListHeader from "./ConversationsListHeader";
import type { Conversation, ConversationUser, ChatMessage } from "@/types/chat";

interface ConversationsListProps {
  activeConversationId?: string;
  onNewConversation?: () => void;
}

// Extended conversation type with enriched user data
interface EnrichedConversation extends Omit<Conversation, "user1" | "user2"> {
  user1: ConversationUser;
  user2: ConversationUser;
}

// Utility: Format relative time
const formatRelativeTime = (date: Date | string): string => {
  const now = new Date();
  const messageDate = new Date(date);
  const diffInSeconds = Math.floor(
    (now.getTime() - messageDate.getTime()) / 1000
  );

  if (diffInSeconds < 60) return "now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;

  return messageDate.toLocaleDateString([], { month: "short", day: "numeric" });
};

// Utility: Get message preview with icon
const getMessagePreview = (
  message?: Conversation["lastMessage"] | null,
  currentUserId?: string
) => {
  if (!message) return { text: "No messages yet", icon: null };

  const isOwnMessage = message.senderId === currentUserId;
  const prefix = isOwnMessage ? "You: " : "";

  const messageType = (message as { type?: string }).type;

  switch (messageType) {
    case "image":
      return { text: `${prefix}Sent a photo`, icon: ImageIcon };
    case "audio":
      return { text: `${prefix}Sent a voice message`, icon: Mic };
    default:
      return { text: `${prefix}${message.text || ""}`, icon: null };
  }
};

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20, transition: { duration: 0.2 } },
};

// Swipeable Conversation Item Component
interface SwipeableConversationProps {
  conversation: EnrichedConversation;
  isActive: boolean;
  currentUserId?: string;
  onlineUsers: Set<string>;
  typingUsers: Map<string, boolean>;
  onClick: () => void;
  onAvatarClick: (user: ConversationUser, isOnline: boolean) => void;
  onPin: () => void;
  onArchive: () => void;
  onDelete: () => void;
}

const SwipeableConversation: React.FC<SwipeableConversationProps> = ({
  conversation,
  isActive,
  currentUserId,
  onlineUsers,
  typingUsers,
  onClick,
  onAvatarClick,
  onPin,
  onArchive,
  onDelete,
}) => {
  const x = useMotionValue(0);
  const background = useTransform(
    x,
    [-150, 0, 150],
    ["#ef4444", "#ffffff", "#22c55e"]
  );

  const otherUser: ConversationUser | undefined =
    conversation.user1?.id === currentUserId
      ? conversation.user2
      : conversation.user1;

  const name = otherUser
    ? `${otherUser.firstName || ""} ${otherUser.lastName || ""}`.trim() ||
      "Unknown"
    : "Unknown";

  const profileImage = otherUser?.profileImage;
  const isOnline = otherUser ? onlineUsers.has(otherUser.id) : false;
  const isTyping = otherUser ? typingUsers.get(otherUser.id) : false;
  const hasUnread = (conversation.unreadCount || 0) > 0;
  const isPinned = conversation.isPinned;

  const { text: previewText, icon: PreviewIcon } = getMessagePreview(
    conversation.lastMessage,
    currentUserId
  );

  const initials = name
    .split(" ")
    .map((n) => n.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleDragEnd = (
    _: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    if (info.offset.x > 100) {
      onArchive();
    } else if (info.offset.x < -100) {
      onDelete();
    }
  };

  const handleAvatarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (otherUser) {
      onAvatarClick(otherUser, isOnline);
    }
  };

  return (
    <motion.div
      variants={itemVariants}
      layout
      className="relative overflow-hidden rounded-lg group"
    >
      {/* Swipe background indicators */}
      <motion.div
        className="absolute inset-0 flex items-center justify-between px-4"
        style={{ background }}
      >
        <Archive className="h-5 w-5 text-white" />
        <Trash2 className="h-5 w-5 text-white" />
      </motion.div>

      {/* Main content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        style={{ x }}
        whileHover={{ backgroundColor: "rgba(243, 207, 198, 0.1)" }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "relative flex items-center gap-3 p-3 rounded-lg cursor-pointer bg-white dark:bg-gray-900 border",
          isActive && "bg-[#F3CFC6]/20 dark:bg-[#F3CFC6]/10 border-[#F3CFC6]",
          hasUnread && !isActive && "bg-[#F3CFC6]/10 border-[#F3CFC6]/50",
          !isActive && !hasUnread && "border-gray-200 hover:border-[#F3CFC6]/30"
        )}
        onClick={onClick}
      >
        {/* Pinned indicator */}
        {isPinned && (
          <div className="absolute top-1 left-1">
            <Pin className="h-3 w-3 text-[#F3CFC6] fill-current" />
          </div>
        )}

        {/* Clickable Avatar with online status */}
        <div className="relative flex-shrink-0">
          <motion.button
            type="button"
            onClick={handleAvatarClick}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative focus:outline-none focus:ring-2 focus:ring-[#F3CFC6] focus:ring-offset-2 rounded-full"
          >
            <Avatar className="h-12 w-12 ring-2 ring-transparent hover:ring-[#F3CFC6] transition-all cursor-pointer">
              <AvatarImage src={profileImage || undefined} alt={name} />
              <AvatarFallback className="bg-gradient-to-br from-[#F3CFC6] to-[#C4C4C4] text-white font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>

            {/* Online indicator */}
            <span
              className={cn(
                "absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-gray-900 transition-colors",
                isOnline ? "bg-green-500" : "bg-gray-400"
              )}
            />

            {/* Professional badge */}
            {otherUser?.isProfessional && (
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-[#F3CFC6] border-2 border-white dark:border-gray-900 flex items-center justify-center">
                <span className="text-[8px] font-bold text-white">PRO</span>
              </span>
            )}
          </motion.button>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span
              className={cn(
                "font-medium truncate text-sm",
                hasUnread && "font-semibold text-black dark:text-white"
              )}
            >
              {name}
            </span>
            <div className="flex items-center gap-1 flex-shrink-0">
              {conversation.lastMessage && (
                <span className="text-xs text-gray-400">
                  {formatRelativeTime(conversation.lastMessage.createdAt)}
                </span>
              )}
            </div>
          </div>

          {/* Message preview or typing indicator */}
          <div className="flex items-center gap-1 mt-0.5">
            {isTyping ? (
              <span className="text-sm text-[#F3CFC6] italic flex items-center gap-1">
                <span className="flex gap-0.5">
                  <motion.span
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                    className="w-1 h-1 bg-[#F3CFC6] rounded-full"
                  />
                  <motion.span
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                    className="w-1 h-1 bg-[#F3CFC6] rounded-full"
                  />
                  <motion.span
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                    className="w-1 h-1 bg-[#F3CFC6] rounded-full"
                  />
                </span>
                typing...
              </span>
            ) : (
              <>
                {PreviewIcon && (
                  <PreviewIcon className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                )}
                <p
                  className={cn(
                    "text-sm truncate",
                    hasUnread
                      ? "text-gray-700 dark:text-gray-200 font-medium"
                      : "text-gray-500"
                  )}
                >
                  {previewText}
                </p>
                {/* Read receipts */}
                {conversation.lastMessage?.senderId === currentUserId && (
                  <span className="flex-shrink-0 ml-1">
                    {(conversation.lastMessage as { read?: boolean })?.read ? (
                      <CheckCheck className="h-3.5 w-3.5 text-blue-500" />
                    ) : (
                      <Check className="h-3.5 w-3.5 text-gray-400" />
                    )}
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {/* Unread badge */}
        <AnimatePresence>
          {hasUnread && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
            >
              <Badge
                variant="destructive"
                className="min-w-[20px] h-5 flex items-center justify-center text-xs px-1.5"
              >
                {conversation.unreadCount! > 99
                  ? "99+"
                  : conversation.unreadCount}
              </Badge>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Context menu trigger */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onPin();
              }}
            >
              <Pin className="mr-2 h-4 w-4" />
              {isPinned ? "Unpin" : "Pin"}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onArchive();
              }}
            >
              <Archive className="mr-2 h-4 w-4" />
              Archive
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </motion.div>
    </motion.div>
  );
};

// Main Component
const ConversationsList: React.FC<ConversationsListProps> = ({
  activeConversationId,
  onNewConversation,
}) => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const [conversations, setConversations] = useState<EnrichedConversation[]>(
    []
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<
    "all" | "unread" | "archived"
  >("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [onlineUsers] = useState<Set<string>>(new Set());
  const [typingUsers] = useState<Map<string, boolean>>(new Map());

  // Profile preview dialog state
  const [selectedUser, setSelectedUser] = useState<ProfileUser | null>(null);
  const [isSelectedUserOnline, setIsSelectedUserOnline] = useState(false);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);

  // Handle avatar click to open profile dialog
  const handleAvatarClick = useCallback(
    (user: ConversationUser, isOnline: boolean) => {
      const profileUser: ProfileUser = {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImage: user.profileImage,
        biography: user.biography,
        location: user.location,
        createdAt: user.createdAt,
        isVerified: user.isVerified,
        isProfessional: user.isProfessional,
        professionalId: user.professionalId,
        rating: user.rating,
        reviewCount: user.reviewCount,
        lastOnline: user.lastOnline,
      };

      setSelectedUser(profileUser);
      setIsSelectedUserOnline(isOnline);
      setIsProfileDialogOpen(true);
    },
    []
  );

  // Handle message click from profile dialog
  const handleMessageFromDialog = useCallback(() => {
    if (!selectedUser) return;

    const conversation = conversations.find(
      (conv) =>
        conv.user1?.id === selectedUser.id || conv.user2?.id === selectedUser.id
    );

    if (conversation) {
      router.push(`/dashboard/messaging/${conversation.id}`);
    }
  }, [selectedUser, conversations, router]);

  // Handle video call from profile dialog
  const handleVideoCallFromDialog = useCallback(async () => {
    if (!selectedUser || !session?.user?.id) return;

    if (!isSelectedUserOnline) {
      toast.error(`${selectedUser.firstName || "User"} is currently offline`);
      return;
    }

    try {
      const res = await fetch("/api/video/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          professionalId: selectedUser.professionalId || selectedUser.id,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to create video session");
      }

      const data = await res.json();
      router.push(`/dashboard/video-session/${data.videoSession.id}`);
    } catch (error) {
      console.error("Video call error:", error);
      toast.error("Failed to start video call");
    }
  }, [selectedUser, isSelectedUserOnline, session, router]);

  // Handle new message from WebSocket
  const handleNewMessage = useCallback(
    (message: ChatMessage) => {
      setConversations((prev) => {
        const updated = prev.map((conv) => {
          if (conv.id === message.conversationId) {
            const isCurrentConversation =
              pathname === `/dashboard/messaging/${conv.id}`;

            let messageType: "text" | "image" | "audio" = "text";
            if (message.isAudio) messageType = "audio";
            else if (message.imageUrl) messageType = "image";

            return {
              ...conv,
              lastMessage: {
                id: message.id,
                text: message.text,
                createdAt: message.createdAt,
                senderId: message.senderId,
                type: messageType,
                read: isCurrentConversation,
              },
              unreadCount: isCurrentConversation
                ? conv.unreadCount
                : (conv.unreadCount || 0) + 1,
            };
          }
          return conv;
        });

        return updated.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          const aTime = a.lastMessage?.createdAt
            ? new Date(a.lastMessage.createdAt).getTime()
            : 0;
          const bTime = b.lastMessage?.createdAt
            ? new Date(b.lastMessage.createdAt).getTime()
            : 0;
          return bTime - aTime;
        });
      });
    },
    [pathname]
  );

  // WebSocket for real-time updates
  const { isConnected } = useWebSocket({
    enabled: status === "authenticated",
    onNewMessage: handleNewMessage,
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
        throw new Error(`Failed to fetch: ${res.status}`);
      }

      const data = await res.json();
      const sorted = (Array.isArray(data) ? data : []).sort(
        (a: EnrichedConversation, b: EnrichedConversation) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          const aTime = a.lastMessage?.createdAt
            ? new Date(a.lastMessage.createdAt).getTime()
            : 0;
          const bTime = b.lastMessage?.createdAt
            ? new Date(b.lastMessage.createdAt).getTime()
            : 0;
          return bTime - aTime;
        }
      );

      setConversations(sorted);
      setError(null);
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Failed to load conversations");
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

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchConversations();
    setRefreshing(false);
    toast.success("Conversations refreshed", { duration: 1500 });
  }, [fetchConversations]);

  // Conversation actions
  const handleConversationClick = async (convId: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, unreadCount: 0 } : c))
    );

    fetch(`/api/conversations/${convId}`, {
      method: "PATCH",
      credentials: "include",
    }).catch(console.error);

    router.push(`/dashboard/messaging/${convId}`);
  };

  const handlePin = async (convId: string) => {
    setConversations((prev) =>
      prev
        .map((c) => (c.id === convId ? { ...c, isPinned: !c.isPinned } : c))
        .sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return 0;
        })
    );

    await fetch(`/api/conversations/${convId}/pin`, {
      method: "PATCH",
      credentials: "include",
    }).catch(console.error);
  };

  const handleArchive = async (convId: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== convId));
    toast.success("Conversation archived", {
      action: {
        label: "Undo",
        onClick: () => fetchConversations(),
      },
    });

    await fetch(`/api/conversations/${convId}/archive`, {
      method: "PATCH",
      credentials: "include",
    }).catch(console.error);
  };

  const handleDelete = async (convId: string) => {
    const conv = conversations.find((c) => c.id === convId);
    setConversations((prev) => prev.filter((c) => c.id !== convId));

    toast.success("Conversation deleted", {
      action: {
        label: "Undo",
        onClick: async () => {
          if (conv) {
            setConversations((prev) => [...prev, conv]);
          }
        },
      },
    });

    await fetch(`/api/conversations/${convId}`, {
      method: "DELETE",
      credentials: "include",
    }).catch(console.error);
  };

  // Computed values
  const totalUnread = useMemo(
    () => conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0),
    [conversations]
  );

  const archivedCount = useMemo(
    () => conversations.filter((c) => c.isArchived).length,
    [conversations]
  );

  // Filter conversations
  const filteredConversations = useMemo(() => {
    return conversations
      .filter((conv) => {
        if (activeFilter === "unread") return (conv.unreadCount || 0) > 0;
        if (activeFilter === "archived") return conv.isArchived;
        return !conv.isArchived;
      })
      .filter((conv) => {
        if (!searchQuery) return true;
        const otherUser =
          conv.user1?.id === session?.user?.id ? conv.user2 : conv.user1;
        const name =
          `${otherUser?.firstName || ""} ${otherUser?.lastName || ""}`.toLowerCase();
        return name.includes(searchQuery.toLowerCase());
      });
  }, [conversations, activeFilter, searchQuery, session?.user?.id]);

  // Loading skeleton
  if (status === "loading" || loading) {
    return <ConversationsListSkeleton />;
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  return (
    <TooltipProvider>
      <motion.div
        className="flex flex-col h-full max-w-7xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header Component */}
        <ConversationsListHeader
          totalConversations={conversations.filter((c) => !c.isArchived).length}
          totalUnread={totalUnread}
          archivedCount={archivedCount}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          isConnected={isConnected}
        />

        {/* Conversations list */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {error ? (
              <div className="flex flex-col items-center justify-center py-12">
                <MessageSquare className="h-12 w-12 mb-3 opacity-50 text-red-400" />
                <p className="text-red-500 text-sm mb-4">{error}</p>
                <Button
                  onClick={fetchConversations}
                  variant="outline"
                  size="sm"
                >
                  Try Again
                </Button>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {filteredConversations.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center py-16 px-4"
                  >
                    <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                      <MessageSquare className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                      {searchQuery
                        ? "No conversations found"
                        : activeFilter === "unread"
                          ? "All caught up!"
                          : activeFilter === "archived"
                            ? "No archived conversations"
                            : "No conversations yet"}
                    </h3>
                    <p className="text-sm text-gray-500 text-center mb-4">
                      {searchQuery
                        ? "Try a different search term"
                        : activeFilter === "unread"
                          ? "You've read all your messages"
                          : activeFilter === "archived"
                            ? "Archived conversations will appear here"
                            : "Start a conversation with someone"}
                    </p>
                    {!searchQuery && activeFilter === "all" && (
                      <Button
                        onClick={onNewConversation}
                        className="bg-[#F3CFC6] hover:bg-[#e9bfb5] text-gray-800"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        New Conversation
                      </Button>
                    )}
                    {(searchQuery || activeFilter !== "all") && (
                      <Button
                        variant="link"
                        onClick={() => {
                          setSearchQuery("");
                          setActiveFilter("all");
                        }}
                        className="text-[#F3CFC6]"
                      >
                        Clear filters
                      </Button>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    className="space-y-2"
                    variants={containerVariants}
                  >
                    {filteredConversations.map((conv) => (
                      <SwipeableConversation
                        key={conv.id}
                        conversation={conv}
                        isActive={
                          conv.id === activeConversationId ||
                          pathname === `/dashboard/messaging/${conv.id}`
                        }
                        currentUserId={session?.user?.id}
                        onlineUsers={onlineUsers}
                        typingUsers={typingUsers}
                        onClick={() => handleConversationClick(conv.id)}
                        onAvatarClick={handleAvatarClick}
                        onPin={() => handlePin(conv.id)}
                        onArchive={() => handleArchive(conv.id)}
                        onDelete={() => handleDelete(conv.id)}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>
        </ScrollArea>

        {/* Profile Preview Dialog */}
        <ProfilePreviewDialog
          user={selectedUser}
          isOpen={isProfileDialogOpen}
          onClose={() => {
            setIsProfileDialogOpen(false);
            setSelectedUser(null);
          }}
          isOnline={isSelectedUserOnline}
          onMessageClick={handleMessageFromDialog}
          onVideoCallClick={handleVideoCallFromDialog}
          currentUserId={session?.user?.id}
        />
      </motion.div>
    </TooltipProvider>
  );
};

// Skeleton loader
function ConversationsListSkeleton() {
  return (
    <div className="flex flex-col h-full max-w-7xl mx-auto">
      {/* Header Skeleton */}
      <div className="p-4 rounded-t-lg border-b bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <Skeleton className="h-8 w-32 bg-white/50" />
            <Skeleton className="h-4 w-48 mt-2 bg-white/50" />
          </div>
          <Skeleton className="h-9 w-24 rounded-full bg-white/50" />
        </div>
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-14 rounded-lg bg-white/50" />
          ))}
        </div>
        <div className="flex gap-2 mb-4">
          <Skeleton className="h-12 flex-1 bg-white/50" />
          <Skeleton className="h-12 w-20 bg-white/50" />
        </div>
        <Skeleton className="h-10 w-full bg-white/50" />
      </div>

      {/* List Skeleton */}
      <div className="p-2 space-y-2">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-3 bg-white rounded-lg border"
          >
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ConversationsList;
