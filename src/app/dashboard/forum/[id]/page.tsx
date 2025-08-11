"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { formatDistanceToNow } from "date-fns";

// Updated: Properly typed debounce utility
const debounce = <T extends unknown[]>(
  func: (...args: T) => void,
  wait: number
) => {
  let timeout: NodeJS.Timeout;
  return (...args: T) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

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
  isPending?: boolean;
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

const replyFormVariants = {
  hidden: { opacity: 0, height: 0, marginTop: 0 },
  visible: {
    opacity: 1,
    height: "auto",
    marginTop: 8,
    transition: { duration: 0.2 },
  },
};

export default function PostPage() {
  const [post, setPost] = useState<Post | null>(null);
  const [newReply, setNewReply] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [collapsedReplies, setCollapsedReplies] = useState<Set<string>>(
    new Set()
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const replyFormRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const textareaRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map());

  const pathname = usePathname();
  const id = pathname.split("/").pop() || "";
  const { data: session, status } = useSession();
  const router = useRouter();

  const fetchPost = useCallback(async () => {
    const response = await fetch(`/api/posts/${id}`);
    const data = await response.json();
    if (response.ok) {
      setPost(data);
    } else {
      console.error("Failed to fetch post:", data.error);
    }
  }, [id]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  const scrollToForm = (replyId: string) => {
    const form = replyFormRefs.current.get(replyId);
    if (!form) return;

    const rect = form.getBoundingClientRect();
    const isInView = rect.top >= 0 && rect.bottom <= window.innerHeight;

    if (!isInView) {
      window.scrollTo({
        top: window.scrollY + rect.top - 100,
        behavior: "smooth",
      });
    }

    const textarea = textareaRefs.current.get(replyId);
    if (textarea) textarea.focus();
  };

  const debouncedScroll = debounce<[string]>(scrollToForm, 200);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchPost();
    }
  }, [status, router, id, fetchPost]); // Added fetchPost to dependencies

  useEffect(() => {
    if (replyTo && replyFormRefs.current.has(replyTo)) {
      debouncedScroll(replyTo);
    }
  }, [replyTo, debouncedScroll]); // Added debouncedScroll to dependencies

  const handleReplySubmit = async (
    e: React.FormEvent,
    parentReplyId: string | null = null
  ) => {
    e.preventDefault();
    if (!newReply || !session?.user) return;

    setIsSubmitting(true);
    setError(null);

    const optimisticReply: Reply = {
      id: `temp-${Date.now()}`,
      content: newReply,
      author: {
        name: session.user.name || "Unknown",
        avatar: session.user.image || "/assets/images/avatar-placeholder.png",
      },
      timestamp: new Date().toLocaleString(),
      parentReplyId: parentReplyId || undefined,
      childReplies: [],
      isPending: true,
    };

    setPost((prev) => {
      if (!prev) return prev;
      if (!parentReplyId) {
        return { ...prev, replies: [...prev.replies, optimisticReply] };
      }
      const updateReplies = (replies: Reply[]): Reply[] =>
        replies.map((reply) =>
          reply.id === parentReplyId
            ? {
                ...reply,
                childReplies: [...reply.childReplies, optimisticReply],
              }
            : { ...reply, childReplies: updateReplies(reply.childReplies) }
        );
      return { ...prev, replies: updateReplies(prev.replies) };
    });

    setNewReply("");
    setReplyTo(null);

    const response = await fetch(`/api/posts/${id}/replies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newReply, parentReplyId }),
    });

    setIsSubmitting(false);

    if (response.ok) {
      const newReplyData = await response.json();
      setPost((prev) => {
        if (!prev) return prev;
        if (!parentReplyId) {
          return {
            ...prev,
            replies: prev.replies.map((r) =>
              r.id === optimisticReply.id
                ? { ...newReplyData, isPending: false }
                : r
            ),
          };
        }
        const updateReplies = (replies: Reply[]): Reply[] =>
          replies.map((reply) =>
            reply.id === parentReplyId
              ? {
                  ...reply,
                  childReplies: reply.childReplies.map((r) =>
                    r.id === optimisticReply.id
                      ? { ...newReplyData, isPending: false }
                      : r
                  ),
                }
              : { ...reply, childReplies: updateReplies(reply.childReplies) }
          );
        return { ...prev, replies: updateReplies(prev.replies) };
      });
    } else {
      console.error("Failed to submit reply:", await response.json());
      const errorData = await response.json();
      setError(errorData.error || "Failed to submit reply. Please try again.");
      setPost((prev) => {
        if (!prev) return prev;
        if (!parentReplyId) {
          return {
            ...prev,
            replies: prev.replies.filter((r) => r.id !== optimisticReply.id),
          };
        }
        const updateReplies = (replies: Reply[]): Reply[] =>
          replies.map((reply) =>
            reply.id === parentReplyId
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
      className={`space-y-2 ${depth > 0 ? "ml-4 pl-4 border-l-2 border-gray-100" : ""}`}
      variants={containerVariants}
    >
      <AnimatePresence>
        {replies.map((reply) => (
          <div key={reply.id}>
            <motion.div
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, y: -10 }}
              className={`p-3 rounded-lg hover:bg-gray-50 transition-colors duration-200 ${reply.isPending ? "opacity-60" : ""}`}
            >
              <div className="flex items-start space-x-3">
                <button
                  onClick={() => toggleCollapse(reply.id)}
                  className="flex-shrink-0 p-1 hover:bg-gray-200 rounded-full transition-colors duration-150"
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
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarImage
                    src={reply.author.avatar}
                    alt={reply.author.name}
                  />
                  <AvatarFallback>{reply.author.name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm text-gray-900">
                      {reply.author.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(reply.timestamp), {
                        addSuffix: true,
                      })}
                      {reply.isPending && (
                        <Loader2 className="inline ml-2 h-3 w-3 animate-spin text-gray-400" />
                      )}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mt-1 break-words">
                    {reply.content}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                      onClick={() => setReplyTo(reply.id)}
                    >
                      <MessageSquare className="mr-1 h-3 w-3" />
                      Reply
                    </Button>
                    {reply.childReplies.length > 0 &&
                      collapsedReplies.has(reply.id) && (
                        <span className="text-xs text-gray-500">
                          {reply.childReplies.length}{" "}
                          {reply.childReplies.length === 1
                            ? "reply"
                            : "replies"}
                        </span>
                      )}
                  </div>
                </div>
              </div>
            </motion.div>
            <AnimatePresence>
              {replyTo === reply.id && (
                <motion.div
                  variants={replyFormVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  className="ml-10 mt-2"
                  ref={(el) => {
                    if (el) replyFormRefs.current.set(reply.id, el);
                    else replyFormRefs.current.delete(reply.id);
                  }}
                >
                  <form
                    onSubmit={(e) => handleReplySubmit(e, reply.id)}
                    className="space-y-2"
                  >
                    <Textarea
                      placeholder="Write your reply..."
                      value={newReply}
                      onChange={(e) => setNewReply(e.target.value)}
                      className="w-full min-h-[80px] text-sm focus:ring-2 focus:ring-blue-300"
                      disabled={isSubmitting}
                      ref={(el) => {
                        if (el) textareaRefs.current.set(reply.id, el);
                        else textareaRefs.current.delete(reply.id);
                      }}
                    />
                    <div className="flex items-center space-x-2">
                      <Button
                        type="submit"
                        size="sm"
                        disabled={!newReply || !session || isSubmitting}
                        className="text-xs"
                      >
                        {isSubmitting ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <Send className="mr-1 h-3 w-3" />
                        )}
                        Reply
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setReplyTo(null)}
                        disabled={isSubmitting}
                        className="text-xs"
                      >
                        Cancel
                      </Button>
                    </div>
                    {error && (
                      <p className="text-red-500 text-xs mt-1">{error}</p>
                    )}
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
            {reply.childReplies.length > 0 &&
              !collapsedReplies.has(reply.id) &&
              renderReplies(reply.childReplies, depth + 1)}
          </div>
        ))}
      </AnimatePresence>
    </motion.div>
  );

  const renderSkeleton = () => (
    <div className="p-4 space-y-6 max-w-7xl mx-auto">
      <Card className="shadow-sm">
        <CardHeader>
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-6 w-3/4" />
          <div className="flex items-center space-x-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6 mt-2" />
        </CardContent>
      </Card>
      <Card className="shadow-sm">
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-3 border-b last:border-b-0">
              <div className="flex items-start space-x-3">
                <Skeleton className="h-4 w-4 mt-1" />
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-4 w-full mt-1" />
                  <Skeleton className="h-3 w-20 mt-2" />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card className="shadow-sm">
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
          <div className="flex space-x-2 mt-4">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
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
      <Card className="shadow-sm">
        <CardHeader>
          <Link href="/dashboard/forum">
            <Button
              variant="outline"
              size="sm"
              className="mb-4 hover:bg-gray-100"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Forum
            </Button>
          </Link>
          <motion.div variants={itemVariants}>
            <CardTitle className="text-xl font-semibold text-gray-900">
              {post.title}
            </CardTitle>
            <div className="flex items-center space-x-2 text-xs text-gray-500 mt-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={post.user.avatar} alt={post.user.name} />
                <AvatarFallback>{post.user.name[0]}</AvatarFallback>
              </Avatar>
              <span>{post.user.name}</span>
              <span>•</span>
              <span>
                {formatDistanceToNow(new Date(post.timestamp), {
                  addSuffix: true,
                })}
              </span>
              <span>•</span>
              <span className="bg-gray-100 px-2 py-1 rounded-full">
                {post.category}
              </span>
            </div>
          </motion.div>
        </CardHeader>
        <CardContent>
          <motion.p variants={itemVariants} className="text-base text-gray-700">
            {post.content}
          </motion.p>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Replies ({post.replies.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {post.replies.length ? (
            renderReplies(post.replies)
          ) : (
            <p className="text-gray-500 text-sm text-center">No replies yet.</p>
          )}
        </CardContent>
      </Card>

      <AnimatePresence>
        {!replyTo && (
          <motion.div
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="sticky bottom-0 bg-white py-4 -mx-4 px-4 shadow-t-sm"
          >
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Add a Reply
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={(e) => handleReplySubmit(e)}
                  className="space-y-2"
                >
                  <Textarea
                    placeholder="Write your reply..."
                    value={newReply}
                    onChange={(e) => setNewReply(e.target.value)}
                    className="w-full min-h-[80px] text-sm focus:ring-2 focus:ring-blue-300"
                    disabled={isSubmitting}
                  />
                  <div className="flex items-center space-x-2">
                    <Button
                      type="submit"
                      size="sm"
                      disabled={!newReply || !session || isSubmitting}
                      className="text-xs"
                    >
                      {isSubmitting ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : (
                        <Send className="mr-1 h-3 w-3" />
                      )}
                      Reply
                    </Button>
                  </div>
                  {error && (
                    <p className="text-red-500 text-xs mt-1">{error}</p>
                  )}
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
