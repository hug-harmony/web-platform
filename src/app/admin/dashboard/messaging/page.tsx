// src/app/admin/dashboard/messaging/page.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MessageCircle,
  Search,
  Calendar,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertTriangle,
  Ban,
  Eye,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";

interface ConversationUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  profileImage?: string;
  status: string;
  isSuspended: boolean;
}

interface Conversation {
  id: string;
  user1: ConversationUser;
  user2: ConversationUser;
  lastMessage?: {
    text: string;
    createdAt: string;
    senderId: string;
  };
  messageCount: number;
  updatedAt: string;
}

interface GlobalSearchResult {
  id: string;
  text: string;
  highlightedText: string;
  createdAt: string;
  conversationId: string;
  sender: {
    id: string;
    name: string;
    email: string;
    profileImage?: string;
    isSuspended: boolean;
  };
  recipient: {
    id: string;
    name: string;
  };
}

interface PaginationInfo {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasMore: boolean;
}

type FilterType = "all" | "today" | "week" | "month";
type ActionType = "warn" | "ban" | "suspend" | null;

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

export default function AdminMessagingPage() {
  // Conversations state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // Global search state
  const [activeTab, setActiveTab] = useState<"conversations" | "search">("conversations");
  const [globalSearchTerm, setGlobalSearchTerm] = useState("");
  const [globalSearchResults, setGlobalSearchResults] = useState<GlobalSearchResult[]>([]);
  const [globalSearchPagination, setGlobalSearchPagination] = useState<PaginationInfo | null>(null);
  const [globalSearchLoading, setGlobalSearchLoading] = useState(false);
  const [globalSearchPage, setGlobalSearchPage] = useState(1);

  // Action dialog state
  const [actionType, setActionType] = useState<ActionType>(null);
  const [targetUser, setTargetUser] = useState<{ id: string; name: string } | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [relatedMessageId, setRelatedMessageId] = useState<string | null>(null);
  const [relatedConversationId, setRelatedConversationId] = useState<string | null>(null);

  const debouncedSearch = useDebounce(searchTerm, 300);
  const debouncedGlobalSearch = useDebounce(globalSearchTerm, 500);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "20",
      });

      if (filter !== "all") {
        params.set("filter", filter);
      }

      if (debouncedSearch) {
        params.set("search", debouncedSearch);
      }

      const response = await fetch(`/api/admin/conversations?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch conversations");
      }

      const data = await response.json();
      setConversations(data.conversations);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      toast.error("Failed to fetch conversations");
    } finally {
      setLoading(false);
    }
  }, [currentPage, filter, debouncedSearch]);

  // Global message search
  const performGlobalSearch = useCallback(async () => {
    if (!debouncedGlobalSearch || debouncedGlobalSearch.length < 2) {
      setGlobalSearchResults([]);
      setGlobalSearchPagination(null);
      return;
    }

    try {
      setGlobalSearchLoading(true);
      const params = new URLSearchParams({
        q: debouncedGlobalSearch,
        page: globalSearchPage.toString(),
        limit: "50",
      });

      if (filter !== "all") {
        params.set("filter", filter);
      }

      const response = await fetch(`/api/admin/messages/search?${params}`);
      if (!response.ok) {
        throw new Error("Search failed");
      }

      const data = await response.json();
      setGlobalSearchResults(data.results);
      setGlobalSearchPagination(data.pagination);
    } catch (error) {
      console.error("Global search error:", error);
      toast.error("Search failed");
    } finally {
      setGlobalSearchLoading(false);
    }
  }, [debouncedGlobalSearch, filter, globalSearchPage]);

  // Handle admin action
  const handleAction = async () => {
    if (!targetUser || !actionType || !actionReason.trim()) {
      toast.error("Please provide a reason for this action");
      return;
    }

    try {
      setActionLoading(true);

      let endpoint = "";
      let method = "POST";

      switch (actionType) {
        case "warn":
          endpoint = `/api/admin/users/${targetUser.id}/warn`;
          break;
        case "ban":
          endpoint = `/api/admin/users/${targetUser.id}/ban`;
          break;
        case "suspend":
          endpoint = `/api/admin/users/${targetUser.id}`;
          method = "PATCH";
          break;
      }

      const body =
        actionType === "suspend"
          ? { status: "suspended" }
          : {
            reason: actionReason,
            messageId: relatedMessageId,
            conversationId: relatedConversationId,
          };

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Action failed");
      }

      const actionLabels = {
        warn: "Warning issued",
        ban: "User banned",
        suspend: "User suspended",
      };

      toast.success(`${actionLabels[actionType]} successfully`);

      // Refresh data
      fetchConversations();
      if (activeTab === "search") {
        performGlobalSearch();
      }

      // Close dialog
      closeActionDialog();
    } catch (error) {
      console.error("Action error:", error);
      toast.error(error instanceof Error ? error.message : "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const openActionDialog = (
    type: ActionType,
    user: { id: string; name: string },
    messageId?: string,
    conversationId?: string
  ) => {
    setActionType(type);
    setTargetUser(user);
    setRelatedMessageId(messageId || null);
    setRelatedConversationId(conversationId || null);
    setActionReason("");
  };

  const closeActionDialog = () => {
    setActionType(null);
    setTargetUser(null);
    setActionReason("");
    setRelatedMessageId(null);
    setRelatedConversationId(null);
  };

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (activeTab === "search") {
      performGlobalSearch();
    }
  }, [performGlobalSearch, activeTab]);

  // Reset page when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
    setGlobalSearchPage(1);
  }, [filter, debouncedSearch, debouncedGlobalSearch]);

  const getFilterLabel = (filterType: FilterType) => {
    switch (filterType) {
      case "today":
        return "Today";
      case "week":
        return "This Week";
      case "month":
        return "This Month";
      default:
        return "All Time";
    }
  };

  const UserBadges = ({ user }: { user: ConversationUser }) => (
    <div className="flex items-center gap-1">
      {user.isSuspended && (
        <Badge variant="destructive" className="text-xs">
          <AlertCircle className="h-3 w-3 mr-1" />
          Suspended
        </Badge>
      )}
      {user.status === "banned" && (
        <Badge variant="destructive" className="text-xs bg-red-700">
          <Ban className="h-3 w-3 mr-1" />
          Banned
        </Badge>
      )}
    </div>
  );

  return (
    <motion.div
      className="space-y-6 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] text-black dark:text-white shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl font-bold">
            <MessageCircle className="mr-2 h-6 w-6" />
            Messaging Oversight
          </CardTitle>
          <p className="text-sm opacity-80">
            Monitor and manage conversations between users. Search messages and take administrative actions.
          </p>
        </CardHeader>
      </Card>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "conversations" | "search")}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="conversations">Conversations</TabsTrigger>
          <TabsTrigger value="search">Global Message Search</TabsTrigger>
        </TabsList>

        {/* Conversations Tab */}
        <TabsContent value="conversations" className="space-y-4">
          {/* Search */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#C4C4C4]" />
            <Input
              placeholder="Search by participant name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 border-[#C4C4C4] focus:ring-[#F3CFC6] dark:bg-black dark:text-white dark:border-[#C4C4C4]"
              aria-label="Search conversations"
            />
          </div>

          {/* Stats Bar */}
          {pagination && (
            <div className="flex items-center justify-between text-sm text-[#C4C4C4]">
              <span>
                Showing {conversations.length} of {pagination.totalCount}{" "}
                conversations
                {filter !== "all" && ` (${getFilterLabel(filter)})`}
              </span>
            </div>
          )}

          {/* Conversations List */}
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                {loading ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin text-[#F3CFC6]" />
                    <span className="ml-2">Loading conversations...</span>
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="p-8 text-center text-[#C4C4C4]">
                    <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No conversations found</p>
                    {(searchTerm || filter !== "all") && (
                      <Button
                        variant="link"
                        onClick={() => {
                          setSearchTerm("");
                          setFilter("all");
                        }}
                        className="mt-2 text-[#F3CFC6]"
                      >
                        Clear filters
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="divide-y divide-[#C4C4C4]/20">
                    <AnimatePresence mode="popLayout">
                      {conversations.map((conv) => (
                        <motion.div
                          key={conv.id}
                          variants={itemVariants}
                          initial="hidden"
                          animate="visible"
                          exit={{ opacity: 0, x: -20 }}
                          layout
                          className="flex items-center justify-between p-4 hover:bg-[#F3CFC6]/10 dark:hover:bg-[#C4C4C4]/10 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-black dark:text-white truncate">
                                {conv.user1.firstName} {conv.user1.lastName}
                              </p>
                              <UserBadges user={conv.user1} />
                              <span className="text-[#C4C4C4]">↔</span>
                              <p className="font-semibold text-black dark:text-white truncate">
                                {conv.user2.firstName} {conv.user2.lastName}
                              </p>
                              <UserBadges user={conv.user2} />
                            </div>

                            <div className="flex items-center gap-2 mt-1 text-sm text-[#C4C4C4]">
                              <span className="truncate max-w-[300px]">
                                {conv.lastMessage?.text?.slice(0, 50) ||
                                  "No messages"}
                                {conv.lastMessage?.text &&
                                  conv.lastMessage.text.length > 50 &&
                                  "..."}
                              </span>
                              <span>•</span>
                              <span>{conv.messageCount} messages</span>
                              <span>•</span>
                              <span>
                                {formatDistanceToNow(new Date(conv.updatedAt), {
                                  addSuffix: true,
                                })}
                              </span>
                            </div>
                          </div>

                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="ml-4 border-[#F3CFC6] text-[#F3CFC6] hover:bg-[#F3CFC6]/10 flex-shrink-0"
                          >
                            <Link href={`/admin/dashboard/messaging/${conv.id}`}>
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Link>
                          </Button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1 || loading}
                className="border-[#C4C4C4]"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>

              <span className="text-sm text-[#C4C4C4]">
                Page {currentPage} of {pagination.totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))
                }
                disabled={currentPage === pagination.totalPages || loading}
                className="border-[#C4C4C4]"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </TabsContent>

        {/* Global Search Tab */}
        <TabsContent value="search" className="space-y-4">
          {/* Global Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#C4C4C4]" />
            <Input
              placeholder="Search any word in all messages..."
              value={globalSearchTerm}
              onChange={(e) => setGlobalSearchTerm(e.target.value)}
              className="pl-10 pr-10 border-[#C4C4C4] focus:ring-[#F3CFC6] dark:bg-black dark:text-white"
              aria-label="Global message search"
            />
            {globalSearchTerm && (
              <button
                onClick={() => setGlobalSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="h-4 w-4 text-[#C4C4C4] hover:text-black" />
              </button>
            )}
          </div>

          {/* Search Instructions */}
          {!globalSearchTerm && (
            <div className="p-8 text-center text-[#C4C4C4]">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Enter at least 2 characters to search across all messages</p>
              <p className="text-sm mt-2">
                Use the time filter above to narrow down results
              </p>
            </div>
          )}

          {/* Search Stats */}
          {globalSearchTerm && globalSearchPagination && (
            <div className="flex items-center justify-between text-sm text-[#C4C4C4]">
              <span>
                Found {globalSearchPagination.totalCount} messages matching
                &quot;{globalSearchTerm}&quot;
                {filter !== "all" && ` (${getFilterLabel(filter)})`}
              </span>
            </div>
          )}

          {/* Search Results */}
          {globalSearchTerm && (
            <Card>
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                  {globalSearchLoading ? (
                    <div className="flex items-center justify-center p-8">
                      <Loader2 className="h-6 w-6 animate-spin text-[#F3CFC6]" />
                      <span className="ml-2">Searching messages...</span>
                    </div>
                  ) : globalSearchResults.length === 0 ? (
                    <div className="p-8 text-center text-[#C4C4C4]">
                      <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No messages found matching your search</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-[#C4C4C4]/20">
                      {globalSearchResults.map((result) => (
                        <motion.div
                          key={result.id}
                          variants={itemVariants}
                          initial="hidden"
                          animate="visible"
                          className="p-4 hover:bg-[#F3CFC6]/10 dark:hover:bg-[#C4C4C4]/10 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              {/* Sender Info */}
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-semibold text-black dark:text-white">
                                  {result.sender.name}
                                </p>
                                {result.sender.isSuspended && (
                                  <Badge variant="destructive" className="text-xs">
                                    Suspended
                                  </Badge>
                                )}
                                <span className="text-[#C4C4C4]">→</span>
                                <p className="text-[#C4C4C4]">{result.recipient.name}</p>
                              </div>

                              {/* Message Content */}
                              <p
                                className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2"
                                dangerouslySetInnerHTML={{
                                  __html: result.highlightedText.replace(
                                    /\*\*(.*?)\*\*/g,
                                    '<mark class="bg-yellow-200 dark:bg-yellow-900 px-0.5 rounded">$1</mark>'
                                  ),
                                }}
                              />

                              {/* Meta */}
                              <p className="text-xs text-[#C4C4C4] mt-1">
                                {format(new Date(result.createdAt), "MMM d, yyyy 'at' h:mm a")}
                              </p>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-2 flex-shrink-0">
                              <Button
                                asChild
                                variant="outline"
                                size="sm"
                                className="border-[#F3CFC6] text-[#F3CFC6] hover:bg-[#F3CFC6]/10"
                              >
                                <Link href={`/admin/dashboard/messaging/${result.conversationId}`}>
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </Link>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  openActionDialog(
                                    "warn",
                                    { id: result.sender.id, name: result.sender.name },
                                    result.id,
                                    result.conversationId
                                  )
                                }
                                className="border-yellow-500 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
                              >
                                <AlertTriangle className="h-4 w-4 mr-1" />
                                Warn
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  openActionDialog(
                                    "ban",
                                    { id: result.sender.id, name: result.sender.name },
                                    result.id,
                                    result.conversationId
                                  )
                                }
                                className="border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                              >
                                <Ban className="h-4 w-4 mr-1" />
                                Ban
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Search Pagination */}
          {globalSearchPagination && globalSearchPagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setGlobalSearchPage((p) => Math.max(1, p - 1))}
                disabled={globalSearchPage === 1 || globalSearchLoading}
                className="border-[#C4C4C4]"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>

              <span className="text-sm text-[#C4C4C4]">
                Page {globalSearchPage} of {globalSearchPagination.totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setGlobalSearchPage((p) =>
                    Math.min(globalSearchPagination.totalPages, p + 1)
                  )
                }
                disabled={
                  globalSearchPage === globalSearchPagination.totalPages ||
                  globalSearchLoading
                }
                className="border-[#C4C4C4]"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Action Dialog */}
      <Dialog open={actionType !== null} onOpenChange={(open) => !open && closeActionDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === "warn" && (
                <>
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  Issue Warning
                </>
              )}
              {actionType === "ban" && (
                <>
                  <Ban className="h-5 w-5 text-red-500" />
                  Ban User
                </>
              )}
              {actionType === "suspend" && (
                <>
                  <AlertCircle className="h-5 w-5 text-orange-500" />
                  Suspend User
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {actionType === "warn" && (
                <>
                  You are about to issue a warning to <strong>{targetUser?.name}</strong>.
                  The user will receive a notification about this warning.
                </>
              )}
              {actionType === "ban" && (
                <>
                  You are about to permanently ban <strong>{targetUser?.name}</strong>.
                  They will not be able to access the platform.
                </>
              )}
              {actionType === "suspend" && (
                <>
                  You are about to suspend <strong>{targetUser?.name}</strong>.
                  They will temporarily lose access to the platform.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Reason for {actionType} <span className="text-red-500">*</span>
              </label>
              <Textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder={`Explain why you are ${actionType === "warn" ? "issuing a warning" : actionType === "ban" ? "banning" : "suspending"} this user...`}
                className="mt-1"
                rows={4}
              />
            </div>

            {relatedMessageId && (
              <p className="text-sm text-[#C4C4C4]">
                This action is related to a specific message.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeActionDialog} disabled={actionLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={actionLoading || !actionReason.trim()}
              variant={actionType === "ban" ? "destructive" : "default"}
              className={
                actionType === "warn"
                  ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                  : actionType === "suspend"
                    ? "bg-orange-500 hover:bg-orange-600 text-white"
                    : undefined
              }
            >
              {actionLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {actionType === "warn" && "Issue Warning"}
              {actionType === "ban" && "Ban User"}
              {actionType === "suspend" && "Suspend User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
