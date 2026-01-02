// src/components/chat/ConversationsListHeader.tsx
"use client";

import { useRef, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  MessageSquare,
  Search,
  RefreshCw,
  Keyboard,
  X,
  Inbox,
  Mail,
  MailOpen,
  Archive,
  Users,
  Filter,
} from "lucide-react";

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

// Filter color mapping
const FILTER_COLORS: Record<string, { bg: string; text: string }> = {
  all: { bg: "bg-gray-100", text: "text-gray-700" },
  unread: { bg: "bg-red-100", text: "text-red-700" },
  archived: { bg: "bg-blue-100", text: "text-blue-700" },
};

interface ConversationsListHeaderProps {
  // Stats
  totalConversations: number;
  totalUnread: number;
  archivedCount: number;
  // Search
  searchQuery: string;
  onSearchChange: (query: string) => void;
  // Filter
  activeFilter: "all" | "unread" | "archived";
  onFilterChange: (filter: "all" | "unread" | "archived") => void;
  // Actions
  onRefresh: () => void;
  refreshing: boolean;
  // Optional
  isConnected?: boolean;
}

export const ConversationsListHeader: React.FC<
  ConversationsListHeaderProps
> = ({
  totalConversations,
  totalUnread,
  archivedCount,
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
  onRefresh,
  refreshing,
  isConnected,
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut handler (/ to focus)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }

      if (
        e.key === "Escape" &&
        document.activeElement === searchInputRef.current
      ) {
        onSearchChange("");
        searchInputRef.current?.blur();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onSearchChange]);

  // Handle search button click
  const handleSearch = () => {
    searchInputRef.current?.focus();
  };

  // Computed stats
  const stats = useMemo(() => {
    const read = totalConversations - totalUnread;
    return {
      total: totalConversations,
      unread: totalUnread,
      read: read > 0 ? read : 0,
      archived: archivedCount,
    };
  }, [totalConversations, totalUnread, archivedCount]);

  // Get filter label
  const getFilterLabel = (filter: string) => {
    switch (filter) {
      case "all":
        return "All Messages";
      case "unread":
        return "Unread";
      case "archived":
        return "Archived";
      default:
        return "All Messages";
    }
  };

  return (
    <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
      <CardHeader className="pb-2">
        <motion.div variants={itemVariants}>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold text-black flex items-center gap-2">
                <MessageSquare className="h-6 w-6" />
                Messages
                {isConnected && (
                  <span
                    className="h-2 w-2 bg-green-500 rounded-full animate-pulse"
                    title="Real-time connected"
                  />
                )}
              </CardTitle>
              <p className="text-sm text-black/70 mt-1">
                {totalUnread > 0
                  ? `${totalUnread} unread message${totalUnread !== 1 ? "s" : ""}`
                  : "All caught up!"}
              </p>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRefresh}
                  disabled={refreshing}
                  className="rounded-full bg-white/80 hover:bg-white"
                >
                  <RefreshCw
                    className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
                  />
                  Refresh
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh conversations</TooltipContent>
            </Tooltip>
          </div>
        </motion.div>
      </CardHeader>
      <CardContent>
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-white/80 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
            <p className="text-xs text-gray-600 flex items-center justify-center gap-1">
              <Users className="h-3 w-3" />
              Total
            </p>
          </div>
          <div className="bg-white/80 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-red-500">{stats.unread}</p>
            <p className="text-xs text-gray-600 flex items-center justify-center gap-1">
              <Mail className="h-3 w-3" />
              Unread
            </p>
          </div>
          <div className="bg-white/80 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.read}</p>
            <p className="text-xs text-gray-600 flex items-center justify-center gap-1">
              <MailOpen className="h-3 w-3" />
              Read
            </p>
          </div>
          <div className="bg-white/80 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.archived}</p>
            <p className="text-xs text-gray-600 flex items-center justify-center gap-1">
              <Inbox className="h-3 w-3" />
              Archived
            </p>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row items-center gap-2">
          {/* Search Input - Enhanced Pattern */}
          <div className="relative flex-grow w-full">
            <Search
              className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground pointer-events-none"
              aria-hidden="true"
            />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Search conversations... (press / to focus)"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-12 pr-12 py-3 rounded-lg border bg-white shadow-sm focus:ring-2 focus:ring-[#F3CFC6]/50"
              data-search-input
              aria-label="Search conversations"
            />
            {/* Right side container */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center">
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => onSearchChange("")}
                  className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded-sm hover:bg-muted"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : (
                <div className="hidden sm:flex items-center text-xs text-muted-foreground">
                  <Keyboard className="h-3 w-3 mr-1" aria-hidden="true" />
                  <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">
                    /
                  </kbd>
                </div>
              )}
            </div>
          </div>

          {/* Search Button */}
          <Button
            onClick={handleSearch}
            className="w-full sm:w-auto bg-white hover:bg-white/80 text-gray-800 shadow-sm"
          >
            <Search className="mr-2 h-4 w-4" aria-hidden="true" />
            Search
          </Button>

          {/* Filter Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="w-full sm:w-auto bg-white shadow-sm"
              >
                <Filter className="mr-2 h-4 w-4" aria-hidden="true" />
                {getFilterLabel(activeFilter)}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Filter Messages</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => onFilterChange("all")}>
                <Badge
                  className={`${FILTER_COLORS.all.bg} ${FILTER_COLORS.all.text} mr-2`}
                >
                  <MessageSquare className="h-3 w-3 mr-1" />
                  All
                </Badge>
                <span className="text-xs text-gray-500 ml-auto">
                  {totalConversations}
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onFilterChange("unread")}>
                <Badge
                  className={`${FILTER_COLORS.unread.bg} ${FILTER_COLORS.unread.text} mr-2`}
                >
                  <Mail className="h-3 w-3 mr-1" />
                  Unread
                </Badge>
                <span className="text-xs text-gray-500 ml-auto">
                  {totalUnread}
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onFilterChange("archived")}>
                <Badge
                  className={`${FILTER_COLORS.archived.bg} ${FILTER_COLORS.archived.text} mr-2`}
                >
                  <Archive className="h-3 w-3 mr-1" />
                  Archived
                </Badge>
                <span className="text-xs text-gray-500 ml-auto">
                  {archivedCount}
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
};

export default ConversationsListHeader;
