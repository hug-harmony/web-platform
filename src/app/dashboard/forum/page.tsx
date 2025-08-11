/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, MessageSquare, Send, User } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

// Type definitions
interface User {
  id: string;
  name: string;
  email: string;
  profileImage?: string | null;
}

interface ForumPost {
  id: string;
  user: {
    name: string;
    avatar: string;
  };
  title: string;
  content: string;
  category: string;
  timestamp: string;
  replies: number;
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      staggerChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export default function ForumPage() {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [newPost, setNewPost] = useState({
    title: "",
    content: "",
    category: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { data: session, status } = useSession();
  const router = useRouter();

  // Fetch user and posts
  useEffect(() => {
    const fetchData = async () => {
      if (status === "loading") return;
      if (status === "unauthenticated") {
        router.push("/login");
        return;
      }

      try {
        // Fetch user data
        const id = session?.user?.id; // Adjust if ID is under a different field (e.g., sub)
        if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
          console.error("Invalid user ID format:", id);
          notFound();
        }

        const userRes = await fetch(`/api/users/${id}`, {
          cache: "no-store",
          credentials: "include",
        });

        if (userRes.ok) {
          const userData = await userRes.json();
          setUser({
            id: userData.id,
            name:
              userData.firstName && userData.lastName
                ? `${userData.firstName} ${userData.lastName}`
                : userData.name || "User",
            email: userData.email || "user@example.com",
            profileImage: userData.profileImage || null,
          });
        } else {
          console.error(
            "User API response:",
            userRes.status,
            await userRes.text()
          );
          if (userRes.status === 401) router.push("/login");
          if (userRes.status === 404) notFound();
          throw new Error(`Failed to fetch user: ${userRes.status}`);
        }

        // Fetch posts
        const postsRes = await fetch("/api/posts", {
          cache: "no-store",
          credentials: "include",
        });
        if (postsRes.ok) {
          const postsData = await postsRes.json();
          setPosts(postsData);
        } else {
          console.error(
            "Posts API response:",
            postsRes.status,
            await postsRes.text()
          );
          throw new Error(`Failed to fetch posts: ${postsRes.status}`);
        }
      } catch (err: any) {
        console.error("Fetch Error:", err.message, err.stack);
        setError("Failed to load forum data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [status, session, router]);

  // Skeleton UI
  const renderSkeleton = () => (
    <div className="p-4 space-y-6 max-w-7xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-32" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <div className="flex space-x-4">
              <Skeleton className="h-10 w-40" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-4 border rounded-md mb-4">
                <div className="flex items-start space-x-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <Skeleton className="h-4 w-full" />
                    <div className="flex space-x-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );

  // Authentication and error handling
  if (status === "loading" || loading) {
    return renderSkeleton();
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  if (error || !user) {
    return (
      <div className="text-center p-6 text-red-500">
        {error || "User data not found."}
      </div>
    );
  }

  // Filter posts
  const categories = Array.from(new Set(posts.map((post) => post.category)));
  const filteredPosts = posts
    .filter((post) =>
      searchQuery
        ? post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          post.content.toLowerCase().includes(searchQuery.toLowerCase())
        : true
    )
    .filter((post) =>
      categoryFilter ? post.category === categoryFilter : true
    );

  // Handle new post submission
  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPost.title && newPost.content) {
      try {
        const response = await fetch("/api/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...newPost,
            user: {
              name: user.name,
              avatar: user.profileImage || "/register.jpg",
            },
          }),
        });
        if (response.ok) {
          const newForumPost = await response.json();
          setPosts([newForumPost, ...posts]);
          setNewPost({ title: "", content: "", category: "" });
        } else {
          console.error(
            "Post submission failed:",
            response.status,
            await response.text()
          );
          throw new Error("Failed to create post");
        }
      } catch (err: any) {
        console.error("Post Submission Error:", err.message, err.stack);
      }
    }
  };

  return (
    <motion.div
      className="p-4 space-y-6 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header Section */}
      <Card>
        <CardHeader>
          <motion.div
            variants={itemVariants}
            className="flex items-center space-x-4"
          >
            <Avatar className="h-16 w-16">
              {user.profileImage ? (
                <AvatarImage src={user.profileImage} alt={user.name} />
              ) : (
                <AvatarFallback className="bg-gray-200 text-gray-600 flex items-center justify-center">
                  <User className="h-10 w-10" />
                </AvatarFallback>
              )}
            </Avatar>
            <div>
              <CardTitle className="text-2xl">Community Forum</CardTitle>
              <p className="text-muted-foreground">
                Connect, share, and support
              </p>
            </div>
          </motion.div>
        </CardHeader>
        <CardContent className="flex space-x-4 w-full">
          <motion.div
            variants={itemVariants}
            className="flex items-center space-x-4 w-full"
          >
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Search forum posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="p-2 pl-10 rounded border border-gray-300 w-full"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  <MessageSquare className="h-5 w-5" />
                  <span>Category</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuLabel>Filter by Category</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setCategoryFilter("")}>
                  All
                </DropdownMenuItem>
                {categories.map((category) => (
                  <DropdownMenuItem
                    key={category}
                    onClick={() => setCategoryFilter(category)}
                  >
                    {category}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </motion.div>
        </CardContent>
      </Card>

      {/* Create New Post */}
      <Card>
        <CardHeader>
          <CardTitle>Create a New Post</CardTitle>
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
              className="w-full"
            />
            <Textarea
              placeholder="Share your thoughts..."
              value={newPost.content}
              onChange={(e) =>
                setNewPost({ ...newPost, content: e.target.value })
              }
              className="w-full"
            />
            <div className="flex items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-auto">
                    {newPost.category || "Select Category"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  <DropdownMenuLabel>Post Category</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {categories.map((category) => (
                    <DropdownMenuItem
                      key={category}
                      onClick={() => setNewPost({ ...newPost, category })}
                    >
                      {category}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button type="submit" className="w-full sm:w-auto">
                <Send className="mr-2 h-4 w-4" />
                Post
              </Button>
            </div>
          </motion.form>
        </CardContent>
      </Card>

      {/* Forum Posts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageSquare className="mr-2 h-5 w-5" />
            Forum Posts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <motion.div className="space-y-4" variants={containerVariants}>
              <AnimatePresence>
                {filteredPosts.length ? (
                  filteredPosts.map((post) => (
                    <motion.div
                      key={post.id}
                      variants={itemVariants}
                      initial="hidden"
                      animate="visible"
                      exit={{ opacity: 0, x: -20 }}
                      className="p-4 hover:bg-gray-50 rounded-md border"
                    >
                      <Link href={`/dashboard/forum/${post.id}`}>
                        <div className="flex items-start space-x-4">
                          <Avatar className="h-10 w-10">
                            <AvatarImage
                              src={post.user.avatar}
                              alt={post.user.name}
                            />
                            <AvatarFallback className="bg-gray-200 text-gray-600 flex items-center justify-center">
                              <User className="h-6 w-6" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h3 className="font-semibold">{post.title}</h3>
                              <p className="text-sm text-muted-foreground">
                                {post.timestamp}
                              </p>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {post.content}
                            </p>
                            <div className="flex items-center space-x-2 mt-2">
                              <span className="text-sm text-muted-foreground">
                                {post.category}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                • {post.replies} Replies
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center">
                    No posts found.
                  </p>
                )}
              </AnimatePresence>
            </motion.div>
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  );
}
