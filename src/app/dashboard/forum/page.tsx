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

interface User {
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

  useEffect(() => {
    const fetchData = async () => {
      if (status !== "authenticated") return;

      setLoading(true);
      setError(null);
      try {
        const id = session?.user?.id;
        if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
          throw new Error("Invalid user ID format");
        }

        const userRes = await fetch(`/api/users/${id}`, {
          cache: "no-store",
          credentials: "include",
        });
        if (!userRes.ok) {
          if (userRes.status === 401) router.push("/login");
          if (userRes.status === 404) notFound();
          throw new Error(`Failed to fetch user: ${userRes.status}`);
        }
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

        const postsRes = await fetch("/api/posts", {
          cache: "no-store",
          credentials: "include",
        });
        if (!postsRes.ok) {
          throw new Error(`Failed to fetch posts: ${postsRes.status}`);
        }
        const postsData = await postsRes.json();
        setPosts(Array.isArray(postsData) ? postsData : []);
      } catch (err: any) {
        console.error("Fetch Error:", err.message);
        setError("Failed to load forum data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [status, session, router]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleCategoryFilterChange = (value: string) => {
    setCategoryFilter(value);
  };

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.title || !newPost.content || !newPost.category) return;

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
      setPosts([newForumPost, ...posts]);
      setNewPost({ title: "", content: "", category: "" });
    } catch (err: any) {
      console.error("Post Submission Error:", err.message);
      setError("Failed to create post. Please try again.");
    }
  };

  const categories = Array.from(new Set(posts.map((post) => post.category)));
  const filteredPosts = posts
    .filter((post) =>
      searchQuery
        ? post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          post.user.name.toLowerCase().includes(searchQuery.toLowerCase())
        : true
    )
    .filter((post) =>
      categoryFilter ? post.category === categoryFilter : true
    );

  const renderSkeleton = () => (
    <motion.div
      className="space-y-6 w-full max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
        <CardHeader>
          <div className="flex items-center space-x-4">
            <Skeleton className="h-16 w-16 rounded-full bg-[#C4C4C4]/50" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-48 bg-[#C4C4C4]/50" />
              <Skeleton className="h-4 w-64 bg-[#C4C4C4]/50" />
            </div>
          </div>
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
          <Skeleton className="h-10 w-full bg-[#C4C4C4]/50" />
          <Skeleton className="h-24 w-full bg-[#C4C4C4]/50" />
          <Skeleton className="h-10 w-40 bg-[#C4C4C4]/50" />
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

  if (status === "loading" || loading) {
    return renderSkeleton();
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  if (error || !user) {
    return (
      <motion.div
        className="space-y-6 w-full max-w-7xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
          <CardHeader>
            <motion.div
              variants={itemVariants}
              className="flex items-center space-x-4"
            >
              <Avatar className="h-16 w-16 border-2 border-white">
                <AvatarFallback className="bg-[#C4C4C4] text-black flex items-center justify-center">
                  <User className="h-10 w-10 text-[#F3CFC6]" />
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-2xl text-black dark:text-white">
                  Community Forum
                </CardTitle>
                <p className="text-sm opacity-80">
                  Connect, share, and support
                </p>
              </div>
            </motion.div>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            <Skeleton className="h-10 w-full sm:w-2/3 bg-[#C4C4C4]/50" />
            <Skeleton className="h-10 w-full sm:w-1/3 bg-[#C4C4C4]/50" />
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardContent className="flex items-center justify-center pt-6">
            <p className="text-red-500 text-sm">
              {error || "User data not found."}
            </p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="space-y-6 w-full max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
        <CardHeader>
          <motion.div
            variants={itemVariants}
            className="flex items-center space-x-4"
          >
            <Avatar className="h-16 w-16 border-2 border-white">
              {user.profileImage ? (
                <AvatarImage src={user.profileImage} alt={user.name} />
              ) : (
                <AvatarFallback className="bg-[#C4C4C4] text-black flex items-center justify-center">
                  <User className="h-10 w-10 text-[#F3CFC6]" />
                </AvatarFallback>
              )}
            </Avatar>
            <div>
              <CardTitle className="text-2xl font-bold text-black dark:text-white">
                Community Forum
              </CardTitle>
              <p className="text-sm opacity-80">Connect, share, and support</p>
            </div>
          </motion.div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center mb-6 w-full space-y-2 sm:space-y-0 sm:space-x-2">
            <div className="relative flex-grow w-full">
              <Search className="absolute left-3 top-1/2 h-6 w-6 -translate-y-1/2 text-[#fff]" />
              <Input
                type="text"
                placeholder="Search posts by title, content, or author..."
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
                    <MessageSquare className="h-6 w-6 text-[#F3CFC6]" />
                    <span>Category</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-white dark:bg-gray-800">
                  <DropdownMenuLabel className="text-black dark:text-white">
                    Filter by Category
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleCategoryFilterChange("")}
                    className="text-black dark:text-white hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20"
                  >
                    All
                  </DropdownMenuItem>
                  {categories.map((category) => (
                    <DropdownMenuItem
                      key={category}
                      onClick={() => handleCategoryFilterChange(category)}
                      className="text-black dark:text-white hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20"
                    >
                      {category}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-black dark:text-white">
            Create a New Post
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
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
              className="w-full text-black dark:text-white border-[#F3CFC6] focus:ring-[#F3CFC6]"
            />
            <Textarea
              placeholder="Share your thoughts..."
              value={newPost.content}
              onChange={(e) =>
                setNewPost({ ...newPost, content: e.target.value })
              }
              className="w-full text-black dark:text-white border-[#F3CFC6] focus:ring-[#F3CFC6]"
            />
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20"
                  >
                    {newPost.category || "Select Category"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-white dark:bg-gray-800">
                  <DropdownMenuLabel className="text-black dark:text-white">
                    Post Category
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {categories.map((category) => (
                    <DropdownMenuItem
                      key={category}
                      onClick={() => setNewPost({ ...newPost, category })}
                      className="text-black dark:text-white hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20"
                    >
                      {category}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                type="submit"
                className="w-full sm:w-auto bg-[#F3CFC6] hover:bg-[#F3CFC6]/80 text-black dark:text-white"
              >
                <Send className="mr-2 h-4 w-4" />
                Post
              </Button>
            </div>
          </motion.form>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-black dark:text-white">
            <MessageSquare className="mr-2 h-6 w-6 text-[#F3CFC6]" />
            Forum Posts
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <ScrollArea className="h-[400px]">
            <motion.div className="space-y-4" variants={containerVariants}>
              <AnimatePresence>
                {filteredPosts.length ? (
                  filteredPosts.map((post) => (
                    <motion.div
                      key={post.id}
                      variants={cardVariants}
                      whileHover={{
                        scale: 1.05,
                        boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
                      }}
                      transition={{ duration: 0.2 }}
                      className="p-4 hover:bg-[#F3CFC6]/10 dark:hover:bg-[#C4C4C4]/10 rounded-md"
                    >
                      <Link href={`/dashboard/forum/${post.id}`}>
                        <div className="flex items-start space-x-4">
                          <Avatar className="h-10 w-10 border-2 border-white">
                            <AvatarImage
                              src={post.user.avatar}
                              alt={post.user.name}
                            />
                            <AvatarFallback className="bg-[#C4C4C4] text-black flex items-center justify-center">
                              <User className="h-6 w-6 text-[#F3CFC6]" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h3 className="font-semibold text-black dark:text-white">
                                {post.title}
                              </h3>
                              <p className="text-sm text-[#C4C4C4]">
                                {post.timestamp}
                              </p>
                            </div>
                            <p className="text-sm text-[#C4C4C4] mt-1 truncate">
                              {post.content}
                            </p>
                            <div className="flex items-center space-x-2 mt-2">
                              <span className="text-sm text-[#F3CFC6]">
                                {post.category}
                              </span>
                              <span className="text-sm text-[#C4C4C4]">
                                • {post.replies} Replies
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))
                ) : (
                  <motion.div
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    className="text-[#C4C4C4] text-center"
                  >
                    No posts found.
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  );
}
