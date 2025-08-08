/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, MessageSquare, User, Send } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";

// Type definitions
interface User {
  name: string;
  email: string;
  avatar: string;
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

// Dummy data
const forumPosts: ForumPost[] = [
  {
    id: "1",
    user: {
      name: "John Doe",
      avatar: "/assets/images/user1.png",
    },
    title: "Coping with Anxiety",
    content:
      "I've been feeling really overwhelmed lately. Does anyone have tips for managing anxiety during stressful times?",
    category: "Mental Health",
    timestamp: "2025-08-07 10:30 AM",
    replies: 5,
  },
  {
    id: "2",
    user: {
      name: "Jane Smith",
      avatar: "/assets/images/user2.png",
    },
    title: "Therapy Session Experiences",
    content:
      "Just had my first therapy session. It was enlightening but also overwhelming. What were your first experiences like?",
    category: "Therapy",
    timestamp: "2025-08-06 3:15 PM",
    replies: 3,
  },
  {
    id: "3",
    user: {
      name: "Alex Brown",
      avatar: "/assets/images/user3.png",
    },
    title: "Mindfulness Techniques",
    content:
      "Looking for recommendations on mindfulness apps or techniques that have worked for you. Any suggestions?",
    category: "Wellness",
    timestamp: "2025-08-05 9:00 AM",
    replies: 8,
  },
];

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
  const [posts, setPosts] = useState<ForumPost[]>(forumPosts);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [newPost, setNewPost] = useState({
    title: "",
    content: "",
    category: "",
  });
  const { data: session, status } = useSession();
  const router = useRouter();

  // Authentication check
  if (status === "loading") {
    return <div className="p-4">Loading...</div>;
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  const user: User = {
    name: session?.user?.name || "User",
    email: session?.user?.email || "user@example.com",
    avatar: session?.user?.image || "/assets/images/avatar-placeholder.png",
  };

  // Filter posts
  const categories = Array.from(
    new Set(forumPosts.map((post) => post.category))
  );
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
  const handlePostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPost.title && newPost.content && newPost.category) {
      const newForumPost: ForumPost = {
        id: `${posts.length + 1}`,
        user: {
          name: user.name,
          avatar: user.avatar,
        },
        title: newPost.title,
        content: newPost.content,
        category: newPost.category,
        timestamp: new Date().toLocaleString(),
        replies: 0,
      };
      setPosts([newForumPost, ...posts]);
      setNewPost({ title: "", content: "", category: "" });
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
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback>{user.name[0]}</AvatarFallback>
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

      {/* Search and Filter */}

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
              onChange={(e: { target: { value: any } }) =>
                setNewPost({ ...newPost, content: e.target.value })
              }
              className="w-full"
            />
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
                      <Link href={`/forum/${post.id}`}>
                        <div className="flex items-start space-x-4">
                          <Avatar className="h-10 w-10">
                            <AvatarImage
                              src={post.user.avatar}
                              alt={post.user.name}
                            />
                            <AvatarFallback>{post.user.name[0]}</AvatarFallback>
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
