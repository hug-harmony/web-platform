/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  MessageSquare,
  Send,
  User,
  RefreshCw,
  Keyboard,
  X,
  Filter,
  Users,
  MessageCircle,
  Hash,
  TrendingUp,
  Clock,
  Flame,
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { notFound } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface UserData {
  id: string;
  name: string;
  email: string;
  profileImage?: string | null;
}

interface ForumPost {
  id: string;
  user: { name: string; avatar: string };
  title: string;
  content: string;
  category: string;
  timestamp: string;
  replies: number;
  createdAt?: string;
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

// Category color mapping
const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  General: { bg: "bg-gray-100", text: "text-gray-700" },
  "Mental Health": { bg: "bg-purple-100", text: "text-purple-700" },
  Wellness: { bg: "bg-green-100", text: "text-green-700" },
  Relationships: { bg: "bg-pink-100", text: "text-pink-700" },
  Career: { bg: "bg-blue-100", text: "text-blue-700" },
  Support: { bg: "bg-yellow-100", text: "text-yellow-700" },
  default: { bg: "bg-[#F3CFC6]/30", text: "text-gray-700" },
};

// Sort options
type SortOption = "recent" | "popular" | "mostReplies";

export default function ForumPage() {
  // Data states - only fetched once on mount
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // UI filter states - these don't trigger refetch
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [activeTab, setActiveTab] = useState<SortOption>("recent");
  const [newPost, setNewPost] = useState({
    title: "",
    content: "",
    category: "",
  });

  const { data: session, status } = useSession();
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Track if initial fetch is done
  const initialFetchDone = useRef(false);

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
        setSearchQuery("");
        searchInputRef.current?.blur();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Fetch data function - only called on mount and manual refresh
  const fetchData = useCallback(
    async (showRefreshToast = false) => {
      if (status !== "authenticated") return;

      if (showRefreshToast) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      try {
        const id = session?.user?.id;
        if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
          throw new Error("Invalid user ID format");
        }

        const [userRes, postsRes] = await Promise.all([
          fetch(`/api/users/${id}`, {
            cache: "no-store",
            credentials: "include",
          }),
          fetch("/api/posts", {
            cache: "no-store",
            credentials: "include",
          }),
        ]);

        if (!userRes.ok) {
          if (userRes.status === 401) router.push("/login");
          if (userRes.status === 404) notFound();
          throw new Error(`Failed to fetch user: ${userRes.status}`);
        }

        if (!postsRes.ok) {
          throw new Error(`Failed to fetch posts: ${postsRes.status}`);
        }

        const userData = await userRes.json();
        const postsData = await postsRes.json();

        setUser({
          id: userData.id,
          name:
            userData.firstName && userData.lastName
              ? `${userData.firstName} ${userData.lastName}`
              : userData.name || "User",
          email: userData.email || "user@example.com",
          profileImage: userData.profileImage || null,
        });

        setPosts(Array.isArray(postsData) ? postsData : []);

        if (showRefreshToast) {
          toast.success("Forum refreshed");
        }
      } catch (err: any) {
        console.error("Fetch Error:", err.message);
        setError("Failed to load forum data. Please try again.");
        if (showRefreshToast) {
          toast.error("Failed to refresh forum data");
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [status, session?.user?.id, router]
  );

  // Initial fetch - only runs once when authenticated
  useEffect(() => {
    if (status === "authenticated" && !initialFetchDone.current) {
      initialFetchDone.current = true;
      fetchData();
    } else if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, fetchData, router]);

  // Handle search button click
  const handleSearch = useCallback(() => {
    if (searchQuery.trim()) {
      toast.info(`Searching for "${searchQuery}"...`);
    }
  }, [searchQuery]);

  // Handle post submission
  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.title || !newPost.content || !newPost.category) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newPost,
          user: {
            name: user!.name,
            avatar: user!.profileImage || "/register.jpg",
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create post: ${response.status}`);
      }

      const newForumPost = await response.json();
      // Add new post to the beginning of the list (optimistic update)
      setPosts((prev) => [newForumPost, ...prev]);
      setNewPost({ title: "", content: "", category: "" });
      toast.success("Post created successfully!");
    } catch (err: any) {
      console.error("Post Submission Error:", err.message);
      toast.error("Failed to create post. Please try again.");
    }
  };

  // Get unique categories from posts
  const categories = useMemo(
    () =>
      Array.from(new Set(posts.map((post) => post.category))).filter(Boolean),
    [posts]
  );

  // Filter and sort posts - ALL CLIENT-SIDE, no refetch!
  const filteredAndSortedPosts = useMemo(() => {
    // First, filter by search query
    let result = posts.filter((post) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        post.title.toLowerCase().includes(query) ||
        post.content.toLowerCase().includes(query) ||
        post.user.name.toLowerCase().includes(query)
      );
    });

    // Then filter by category
    if (categoryFilter) {
      result = result.filter((post) => post.category === categoryFilter);
    }

    // Finally, sort based on active tab
    switch (activeTab) {
      case "popular":
        // Sort by replies (most popular)
        result = [...result].sort((a, b) => b.replies - a.replies);
        break;
      case "mostReplies":
        // Sort by replies descending
        result = [...result].sort((a, b) => b.replies - a.replies);
        break;
      case "recent":
      default:
        // Sort by timestamp/createdAt (most recent first)
        result = [...result].sort((a, b) => {
          const dateA = new Date(a.createdAt || a.timestamp).getTime();
          const dateB = new Date(b.createdAt || b.timestamp).getTime();
          return dateB - dateA;
        });
        break;
    }

    return result;
  }, [posts, searchQuery, categoryFilter, activeTab]);

  // Stats - computed from posts, no refetch needed
  const stats = useMemo(() => {
    const totalReplies = posts.reduce((sum, post) => sum + post.replies, 0);
    const uniqueAuthors = new Set(posts.map((post) => post.user.name)).size;

    return {
      totalPosts: posts.length,
      totalReplies,
      categories: categories.length,
      authors: uniqueAuthors,
    };
  }, [posts, categories]);

  // Get category colors
  const getCategoryColors = (category: string) => {
    return CATEGORY_COLORS[category] || CATEGORY_COLORS.default;
  };

  // Loading state
  if (status === "loading" || loading) {
    return <ForumSkeleton />;
  }

  if (status === "unauthenticated") {
    return null;
  }

  if (error || !user) {
    return (
      <motion.div
        className="p-4 space-y-6 max-w-7xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border-2 border-white">
                  <AvatarFallback className="bg-[#C4C4C4] text-black">
                    <User className="h-8 w-8 text-[#F3CFC6]" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-2xl font-bold text-black">
                    Community Forum
                  </CardTitle>
                  <p className="text-sm text-black/70 mt-1">
                    Connect, share, and support
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>
        <Card className="shadow-lg">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-12 w-12 mb-3 opacity-50 text-red-400" />
            <p className="text-red-500 text-lg font-medium mb-4">
              {error || "User data not found."}
            </p>
            <Button onClick={() => fetchData()} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
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
      {/* Header */}
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
        <CardHeader className="pb-2">
          <motion.div variants={itemVariants}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border-2 border-white shadow-md">
                  {user.profileImage ? (
                    <AvatarImage src={user.profileImage} alt={user.name} />
                  ) : (
                    <AvatarFallback className="bg-gradient-to-br from-[#F3CFC6] to-[#C4C4C4] text-white font-semibold text-xl">
                      {user.name
                        .split(" ")
                        .map((n) => n.charAt(0))
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <CardTitle className="text-2xl font-bold text-black flex items-center gap-2">
                    Community Forum
                  </CardTitle>
                  <p className="text-sm text-black/70 mt-1">
                    Welcome back, {user.name.split(" ")[0]}! Connect, share, and
                    support others.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchData(true)}
                disabled={refreshing}
                className="rounded-full bg-white/80 hover:bg-white"
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>
          </motion.div>
        </CardHeader>
        <CardContent>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-white/80 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-gray-800">
                {stats.totalPosts}
              </p>
              <p className="text-xs text-gray-600 flex items-center justify-center gap-1">
                <MessageSquare className="h-3 w-3" />
                Posts
              </p>
            </div>
            <div className="bg-white/80 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-blue-600">
                {stats.totalReplies}
              </p>
              <p className="text-xs text-gray-600 flex items-center justify-center gap-1">
                <MessageCircle className="h-3 w-3" />
                Replies
              </p>
            </div>
            <div className="bg-white/80 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-purple-600">
                {stats.categories}
              </p>
              <p className="text-xs text-gray-600 flex items-center justify-center gap-1">
                <Hash className="h-3 w-3" />
                Categories
              </p>
            </div>
            <div className="bg-white/80 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-600">
                {stats.authors}
              </p>
              <p className="text-xs text-gray-600 flex items-center justify-center gap-1">
                <Users className="h-3 w-3" />
                Authors
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
                placeholder="Search posts by title, content, or author... (press / to focus)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-12 py-3 rounded-lg border bg-white shadow-sm focus:ring-2 focus:ring-[#F3CFC6]/50"
                data-search-input
                aria-label="Search posts"
              />
              {/* Right side container */}
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center">
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
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

            {/* Category Filter Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full sm:w-auto bg-white shadow-sm"
                >
                  <Filter className="mr-2 h-4 w-4" aria-hidden="true" />
                  {categoryFilter || "All Categories"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Filter by Category</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setCategoryFilter("")}>
                  All Categories
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {categories.map((category) => {
                  const colors = getCategoryColors(category);
                  return (
                    <DropdownMenuItem
                      key={category}
                      onSelect={() => setCategoryFilter(category)}
                    >
                      <Badge className={`${colors.bg} ${colors.text} mr-2`}>
                        {category}
                      </Badge>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Create New Post */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-black">
            <Send className="mr-2 h-5 w-5 text-[#F3CFC6]" />
            Create a New Post
          </CardTitle>
        </CardHeader>
        <CardContent>
          <motion.form
            onSubmit={handlePostSubmit}
            className="space-y-4"
            variants={itemVariants}
          >
            <Input
              type="text"
              placeholder="Post title"
              value={newPost.title}
              onChange={(e) =>
                setNewPost({ ...newPost, title: e.target.value })
              }
              className="w-full border-gray-200 focus:ring-[#F3CFC6] focus:border-[#F3CFC6]"
            />
            <Textarea
              placeholder="Share your thoughts..."
              value={newPost.content}
              onChange={(e) =>
                setNewPost({ ...newPost, content: e.target.value })
              }
              className="w-full min-h-[100px] border-gray-200 focus:ring-[#F3CFC6] focus:border-[#F3CFC6]"
            />
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    type="button"
                    className="w-full sm:w-auto"
                  >
                    <Hash className="mr-2 h-4 w-4" />
                    {newPost.category || "Select Category"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Post Category</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {(categories.length > 0
                    ? categories
                    : ["General", "Mental Health", "Wellness", "Support"]
                  ).map((category) => {
                    const colors = getCategoryColors(category);
                    return (
                      <DropdownMenuItem
                        key={category}
                        onSelect={() => setNewPost({ ...newPost, category })}
                      >
                        <Badge className={`${colors.bg} ${colors.text} mr-2`}>
                          {category}
                        </Badge>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                type="submit"
                className="w-full sm:w-auto bg-[#F3CFC6] hover:bg-[#e9bfb5] text-gray-800"
                disabled={
                  !newPost.title || !newPost.content || !newPost.category
                }
              >
                <Send className="mr-2 h-4 w-4" />
                Post
              </Button>
            </div>
          </motion.form>
        </CardContent>
      </Card>

      {/* Forum Posts */}
      <Card className="shadow-lg">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="flex items-center text-black">
              <TrendingUp className="mr-2 h-5 w-5 text-[#F3CFC6]" />
              Forum Posts
              {filteredAndSortedPosts.length > 0 && (
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({filteredAndSortedPosts.length})
                </span>
              )}
            </CardTitle>

            {/* Sort Tabs - Client-side only, no refetch! */}
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as SortOption)}
            >
              <TabsList className="bg-gray-100">
                <TabsTrigger
                  value="recent"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-gray-700 flex items-center gap-1"
                >
                  <Clock className="h-3.5 w-3.5" />
                  Recent
                </TabsTrigger>
                <TabsTrigger
                  value="popular"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-gray-700 flex items-center gap-1"
                >
                  <Flame className="h-3.5 w-3.5" />
                  Popular
                </TabsTrigger>
                <TabsTrigger
                  value="mostReplies"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-gray-700 flex items-center gap-1"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  Most Replies
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] pr-4">
            <motion.div className="space-y-3" variants={containerVariants}>
              <AnimatePresence mode="popLayout">
                {filteredAndSortedPosts.length > 0 ? (
                  filteredAndSortedPosts.map((post) => {
                    const categoryColors = getCategoryColors(post.category);
                    return (
                      <motion.div
                        key={post.id}
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        layout
                        whileHover={{
                          scale: 1.01,
                          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        }}
                        transition={{ duration: 0.2 }}
                        className="border rounded-lg bg-white hover:border-[#F3CFC6] transition-colors"
                      >
                        <Link href={`/dashboard/forum/${post.id}`}>
                          <div className="p-4">
                            <div className="flex items-start gap-4">
                              <Avatar className="h-10 w-10 flex-shrink-0">
                                <AvatarImage
                                  src={post.user.avatar}
                                  alt={post.user.name}
                                />
                                <AvatarFallback className="bg-gradient-to-br from-[#F3CFC6] to-[#C4C4C4] text-white font-semibold">
                                  {post.user.name
                                    .split(" ")
                                    .map((n) => n.charAt(0))
                                    .join("")
                                    .slice(0, 2)
                                    .toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <h3 className="font-semibold text-black hover:text-[#F3CFC6] transition-colors line-clamp-1">
                                      {post.title}
                                    </h3>
                                    <p className="text-sm text-gray-500">
                                      by {post.user.name}
                                    </p>
                                  </div>
                                  <span className="text-xs text-gray-400 flex-shrink-0">
                                    {post.timestamp}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                                  {post.content}
                                </p>
                                <div className="flex items-center gap-3 mt-3">
                                  <Badge
                                    className={`${categoryColors.bg} ${categoryColors.text}`}
                                  >
                                    {post.category}
                                  </Badge>
                                  <span className="text-sm text-gray-500 flex items-center gap-1">
                                    <MessageCircle className="h-3.5 w-3.5" />
                                    {post.replies}{" "}
                                    {post.replies === 1 ? "reply" : "replies"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                    <MessageSquare className="h-16 w-16 mb-4 opacity-30" />
                    <p className="text-lg font-medium">No posts found</p>
                    <p className="text-sm text-gray-400 mt-1">
                      {searchQuery || categoryFilter
                        ? "Try adjusting your filters"
                        : "Be the first to start a conversation!"}
                    </p>
                    {(searchQuery || categoryFilter) && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSearchQuery("");
                          setCategoryFilter("");
                        }}
                        className="mt-4"
                      >
                        <X className="mr-2 h-4 w-4" />
                        Clear Filters
                      </Button>
                    )}
                  </div>
                )}
              </AnimatePresence>
            </motion.div>
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Skeleton loader
function ForumSkeleton() {
  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto">
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4]">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full bg-white/50" />
              <div>
                <Skeleton className="h-8 w-48 bg-white/50" />
                <Skeleton className="h-4 w-64 mt-2 bg-white/50" />
              </div>
            </div>
            <Skeleton className="h-9 w-24 rounded-full bg-white/50" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 rounded-lg bg-white/50" />
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Skeleton className="h-12 flex-1 bg-white/50" />
            <Skeleton className="h-12 w-24 bg-white/50" />
            <Skeleton className="h-12 w-36 bg-white/50" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <div className="flex gap-3">
              <Skeleton className="h-10 w-36" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-10 w-64" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 w-full rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
