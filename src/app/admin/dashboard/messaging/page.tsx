// src/app/admin/dashboard/messaging/page.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  MessageCircle,
  Search,
  Calendar,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { formatDistanceToNow } from "date-fns";

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

interface PaginationInfo {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasMore: boolean;
}

type FilterType = "all" | "today" | "week" | "month";

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
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const debouncedSearch = useDebounce(searchTerm, 300);

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
    } finally {
      setLoading(false);
    }
  }, [currentPage, filter, debouncedSearch]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Reset page when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, debouncedSearch]);

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
            Monitor and manage conversations between users.
          </p>
        </CardHeader>
      </Card>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
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
    </motion.div>
  );
}
