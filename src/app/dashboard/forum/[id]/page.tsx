"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Send,
  ArrowLeft,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";

interface Post {
  id: string;
  user: { name: string; avatar: string };
  title: string;
  content: string;
  category: string;
  timestamp: string;
  replies: Reply[];
}

interface Reply {
  id: string;
  content: string;
  author: { name: string; avatar: string };
  timestamp: string;
  parentReplyId?: string;
  childReplies: Reply[];
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
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function PostPage() {
  const [post, setPost] = useState<Post | null>(null);
  const [newReply, setNewReply] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [collapsedReplies, setCollapsedReplies] = useState<Set<string>>(
    new Set()
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pathname = usePathname();
  const id = pathname.split("/").pop() || "";
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchPost();
    }
  }, [status, router, id]);

  const fetchPost = async () => {
    const response = await fetch(`/api/posts/${id}`);
    const data = await response.json();
    if (response.ok) {
      setPost(data);
    } else {
      console.error("Failed to fetch post:", data.error);
    }
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReply || !session?.user) return;

    setIsSubmitting(true);

    const optimisticReply: Reply = {
      id: `temp-${Date.now()}`,
      content: newReply,
      author: {
        name: session.user.name || "Unknown",
        avatar: session.user.image || "/assets/images/avatar-placeholder.png",
      },
      timestamp: new Date().toLocaleString(),
      parentReplyId: replyTo || undefined,
      childReplies: [],
    };

    // Add optimistic reply
    setPost((prev) => {
      if (!prev) return prev;
      if (!replyTo) {
        return { ...prev, replies: [...prev.replies, optimisticReply] };
      }
      const updateReplies = (replies: Reply[]): Reply[] =>
        replies.map((reply) =>
          reply.id === replyTo
            ? {
                ...reply,
                childReplies: [...reply.childReplies, optimisticReply],
              }
            : { ...reply, childReplies: updateReplies(reply.childReplies) }
        );
      return { ...prev, replies: updateReplies(prev.replies) };
    });

    try {
      const response = await fetch(`/api/posts/${id}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newReply, parentReplyId: replyTo }),
      });

      if (!response.ok) {
        throw new Error(`Failed to submit reply: ${response.statusText}`);
      }

      const newReplyData = await response.json();

      // Update state with server response
      setPost((prev) => {
        if (!prev) return prev;
        if (!replyTo) {
          return {
            ...prev,
            replies: prev.replies.map((r) =>
              r.id === optimisticReply.id ? newReplyData : r
            ),
          };
        }
        const updateReplies = (replies: Reply[]): Reply[] =>
          replies.map((reply) =>
            reply.id === replyTo
              ? {
                  ...reply,
                  childReplies: reply.childReplies.map((r) =>
                    r.id === optimisticReply.id ? newReplyData : r
                  ),
                }
              : { ...reply, childReplies: updateReplies(reply.childReplies) }
          );
        return { ...prev, replies: updateReplies(prev.replies) };
      });

      setNewReply("");
      setReplyTo(null);
    } catch (error) {
      console.error("Failed to submit reply:", error);
      // Revert optimistic update on failure
      setPost((prev) => {
        if (!prev) return prev;
        if (!replyTo) {
          return {
            ...prev,
            replies: prev.replies.filter((r) => r.id !== optimisticReply.id),
          };
        }
        const updateReplies = (replies: Reply[]): Reply[] =>
          replies.map((reply) =>
            reply.id === replyTo
              ? {
                  ...reply,
                  childReplies: reply.childReplies.filter(
                    (r) => r.id !== optimisticReply.id
                  ),
                }
              : { ...reply, childReplies: updateReplies(reply.childReplies) }
          );
        return { ...prev, replies: updateReplies(prev.replies) };
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleCollapse = (replyId: string) => {
    setCollapsedReplies((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(replyId)) {
        newSet.delete(replyId);
      } else {
        newSet.add(replyId);
      }
      return newSet;
    });
  };

  const renderReplies = (replies: Reply[], depth: number = 0) => (
    <motion.div
      className={`space-y-4 ${depth > 0 ? "ml-6 border-l-2 border-gray-200 pl-4" : ""}`}
      variants={containerVariants}
    >
      <AnimatePresence>
        {replies.map((reply) => (
          <motion.div
            key={reply.id}
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, y: -10 }}
            className="p-4 border rounded-md hover:bg-gray-50"
          >
            <div className="flex items-start space-x-4">
              <button
                onClick={() => toggleCollapse(reply.id)}
                className="flex-shrink-0 p-1"
                aria-label={
                  collapsedReplies.has(reply.id)
                    ? "Expand thread"
                    : "Collapse thread"
                }
              >
                {reply.childReplies.length > 0 &&
                  (collapsedReplies.has(reply.id) ? (
                    <ChevronRight className="h-4 w-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  ))}
              </button>
              <Avatar className="h-8 w-8">
                <AvatarImage
                  src={reply.author.avatar}
                  alt={reply.author.name}
                />
                <AvatarFallback>{reply.author.name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{reply.author.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {reply.timestamp}
                  </span>
                </div>
                <p className="text-sm mt-1">{reply.content}</p>
                <Button
                  variant="link"
                  className="text-sm p-0 mt-2 text-blue-500"
                  onClick={() => setReplyTo(reply.id)}
                >
                  <MessageSquare className="mr-1 h-4 w-4" />
                  Reply
                </Button>
                {reply.childReplies.length > 0 &&
                  !collapsedReplies.has(reply.id) &&
                  renderReplies(reply.childReplies, depth + 1)}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );

  const renderSkeleton = () => (
    <div className="p-4 space-y-6 max-w-7xl mx-auto">
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-24" /> {/* Back button */}
          <Skeleton className="h-6 w-3/4" /> {/* Title */}
          <div className="flex items-center space-x-2">
            <Skeleton className="h-8 w-8 rounded-full" /> {/* Avatar */}
            <Skeleton className="h-4 w-24" /> {/* Username */}
            <Skeleton className="h-4 w-16" /> {/* Timestamp */}
            <Skeleton className="h-4 w-20" /> {/* Category */}
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full" /> {/* Content lines */}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" /> {/* Replies title */}
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-4 border rounded-md mb-4">
                <div className="flex items-start space-x-4">
                  <Skeleton className="h-6 w-6" /> {/* Collapse button */}
                  <Skeleton className="h-8 w-8 rounded-full" /> {/* Avatar */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-24" /> {/* Username */}
                      <Skeleton className="h-4 w-16" /> {/* Timestamp */}
                    </div>
                    <Skeleton className="h-4 w-full" /> {/* Reply content */}
                    <Skeleton className="h-4 w-20 mt-2" /> {/* Reply button */}
                  </div>
                </div>
              </div>
            ))}
          </ScrollArea>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" /> {/* Reply form title */}
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" /> {/* Textarea */}
          <div className="flex space-x-2 mt-4">
            <Skeleton className="h-10 w-24" /> {/* Submit button */}
            <Skeleton className="h-10 w-24" /> {/* Cancel button */}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  if (status === "loading" || !post) {
    return renderSkeleton();
  }

  return (
    <motion.div
      className="p-4 space-y-6 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Card>
        <CardHeader>
          <Link href="/dashboard/forum">
            <Button variant="outline" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Forum
            </Button>
          </Link>
          <motion.div variants={itemVariants}>
            <CardTitle className="text-xl">{post.title}</CardTitle>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Avatar className="h-8 w-8">
                <AvatarImage src={post.user.avatar} alt={post.user.name} />
                <AvatarFallback>{post.user.name[0]}</AvatarFallback>
              </Avatar>
              <span>{post.user.name}</span>
              <span>• {post.timestamp}</span>
              <span>• {post.category}</span>
            </div>
          </motion.div>
        </CardHeader>
        <CardContent>
          <motion.p variants={itemVariants} className="text-base">
            {post.content}
          </motion.p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Replies ({post.replies.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            {post.replies.length ? (
              renderReplies(post.replies)
            ) : (
              <p className="text-muted-foreground text-center">
                No replies yet.
              </p>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{replyTo ? "Reply to Comment" : "Add a Reply"}</CardTitle>
        </CardHeader>
        <CardContent>
          <motion.form
            onSubmit={handleReplySubmit}
            className="space-y-4"
            variants={itemVariants}
          >
            <Textarea
              placeholder={
                replyTo
                  ? "Write your reply to the comment..."
                  : "Write your reply..."
              }
              value={newReply}
              onChange={(e) => setNewReply(e.target.value)}
              className="w-full min-h-[100px]"
              disabled={isSubmitting}
            />
            <div className="flex space-x-2">
              <Button
                type="submit"
                disabled={!newReply || !session || isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Reply
              </Button>
              {replyTo && (
                <Button
                  variant="outline"
                  onClick={() => setReplyTo(null)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              )}
            </div>
          </motion.form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
