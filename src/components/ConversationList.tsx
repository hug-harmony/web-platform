"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { MessageSquare } from "lucide-react";
import Link from "next/link";

// Type definitions based on schema
interface User {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  profileImage?: string | null;
}

interface Specialist {
  id: string;
  name: string;
  image?: string | null;
}

interface Conversation {
  id: string;
  user1?: User | null;
  user2?: User | null;
  specialist1?: Specialist | null;
  specialist2?: Specialist | null;
  lastMessage?: { text: string; createdAt: string } | null;
  messageCount: number;
}

interface ConversationsListProps {
  activeConversationId?: string;
}

// Animation variants
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

const ConversationsList: React.FC<ConversationsListProps> = ({
  activeConversationId,
}) => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConversations = async () => {
      if (status !== "authenticated") return;

      setLoading(true);
      setError(null);
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
          throw new Error(`Failed to fetch conversations: ${res.status}`);
        }

        const data = await res.json();
        setConversations(data);
      } catch (err) {
        console.error("Fetch conversations error:", err);
        setError("Failed to load conversations. Please try again.");
        toast.error("Failed to load conversations");
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [status, router]);

  const handleConversationClick = (convId: string) => {
    if (!/^[0-9a-fA-F]{24}$/.test(convId)) {
      toast.error("Invalid conversation ID");
      return;
    }
    router.push(`/dashboard/messaging/${convId}`);
  };

  if (status === "loading" || loading) {
    return (
      <motion.div
        className="p-4 space-y-6 max-w-7xl mx-auto"
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
          <CardContent className="flex space-x-4">
            <Skeleton className="h-10 w-40 rounded-full bg-[#C4C4C4]/50" />
          </CardContent>
        </Card>
        <Card className="shadow-lg flex flex-col">
          <CardHeader>
            <Skeleton className="h-8 w-48 bg-[#C4C4C4]/50" />
          </CardHeader>
          <CardContent className="flex-1 space-y-4 pt-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2">
                <Skeleton className="h-10 w-10 rounded-full bg-[#C4C4C4]/50" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/2 bg-[#C4C4C4]/50" />
                  <Skeleton className="h-3 w-3/4 bg-[#C4C4C4]/50" />
                </div>
                <Skeleton className="h-4 w-16 bg-[#C4C4C4]/50" />
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (!session) {
    return (
      <motion.div
        className="p-4 space-y-6 max-w-7xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
          <CardHeader>
            <motion.div variants={itemVariants}>
              <CardTitle className="text-2xl text-black dark:text-white">
                Conversations
              </CardTitle>
              <p className="text-sm text-black">Manage your conversations</p>
            </motion.div>
          </CardHeader>
          <CardContent className="flex space-x-4">
            <motion.div
              variants={itemVariants}
              whileHover={{
                scale: 1.05,
                boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
              }}
              transition={{ duration: 0.2 }}
            >
              <Button
                asChild
                variant="outline"
                className="text-[#F3CFC6] border-[#F3CFC6] hover:bg-white dark:hover:bg-white rounded-full"
              >
                <Link href="/dashboard">
                  <MessageSquare className="mr-2 h-4 w-4 text-[#F3CFC6]" />
                  Back to Dashboard
                </Link>
              </Button>
            </motion.div>
          </CardContent>
        </Card>
        <Card className="shadow-lg flex flex-col">
          <CardContent className="flex-1 flex items-center justify-center pt-6">
            <p className="text-[#C4C4C4]">
              Please log in to view conversations.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        className="p-4 space-y-6 max-w-7xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
          <CardHeader>
            <motion.div variants={itemVariants}>
              <CardTitle className="text-2xl text-black dark:text-white">
                Conversations
              </CardTitle>
              <p className="text-sm text-[#C4C4C4]">
                Manage your conversations
              </p>
            </motion.div>
          </CardHeader>
          <CardContent className="flex space-x-4">
            <motion.div
              variants={itemVariants}
              whileHover={{
                scale: 1.05,
                boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
              }}
              transition={{ duration: 0.2 }}
            >
              <Button
                asChild
                variant="outline"
                className="text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20 rounded-full"
              >
                <Link href="/dashboard">
                  <MessageSquare className="mr-2 h-4 w-4 text-[#F3CFC6]" />
                  Back to Dashboard
                </Link>
              </Button>
            </motion.div>
          </CardContent>
        </Card>
        <Card className="shadow-lg flex flex-col">
          <CardContent className="flex-1 flex items-center justify-center pt-6">
            <p className="text-red-500">{error}</p>
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
      {/* Header Section */}
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
        <CardHeader>
          <motion.div variants={itemVariants}>
            <CardTitle className="text-2xl text-black dark:text-white">
              Conversations
            </CardTitle>
            <p className="text-sm text-[#C4C4C4]">Manage your conversations</p>
          </motion.div>
        </CardHeader>
        <CardContent className="flex space-x-4">
          <motion.div
            variants={itemVariants}
            whileHover={{
              scale: 1.05,
              boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
            }}
            transition={{ duration: 0.2 }}
          >
            <Button
              asChild
              variant="outline"
              className="text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20 rounded-full"
            >
              <Link href="/dashboard">
                <MessageSquare className="mr-2 h-4 w-4 text-[#F3CFC6]" />
                Back to Dashboard
              </Link>
            </Button>
          </motion.div>
        </CardContent>
      </Card>

      {/* Conversations List */}
      <Card className="shadow-lg flex flex-col">
        <CardHeader>
          <CardTitle className="text-black dark:text-white">
            Your Conversations
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-0 pt-6">
          {conversations.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-[#C4C4C4]">No conversations found.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#F3CFC6]/20">
              {conversations.map((conv) => {
                // Determine the other participant (user or specialist)
                let otherParticipant: User | Specialist | null;
                let name: string;
                let profileImage: string | undefined | null;

                if (conv.user1?.id === session.user.id) {
                  otherParticipant = conv.user2 || conv.specialist2 || null;
                  name = conv.user2
                    ? `${conv.user2.firstName || ""} ${conv.user2.lastName || ""}`.trim() ||
                      "Unknown User"
                    : conv.specialist2?.name || "Unknown Specialist";
                  profileImage = conv.user2
                    ? conv.user2.profileImage
                    : conv.specialist2?.image;
                } else if (conv.user2?.id === session.user.id) {
                  otherParticipant = conv.user1 || conv.specialist1 || null;
                  name = conv.user1
                    ? `${conv.user1.firstName || ""} ${conv.user1.lastName || ""}`.trim() ||
                      "Unknown User"
                    : conv.specialist1?.name || "Unknown Specialist";
                  profileImage = conv.user1
                    ? conv.user1.profileImage
                    : conv.specialist1?.image;
                } else if (conv.specialist1?.id === session.user.id) {
                  otherParticipant = conv.user2 || conv.specialist2 || null;
                  name = conv.user2
                    ? `${conv.user2.firstName || ""} ${conv.user2.lastName || ""}`.trim() ||
                      "Unknown User"
                    : conv.specialist2?.name || "Unknown Specialist";
                  profileImage = conv.user2
                    ? conv.user2.profileImage
                    : conv.specialist2?.image;
                } else if (conv.specialist2?.id === session.user.id) {
                  otherParticipant = conv.user1 || conv.specialist1 || null;
                  name = conv.user1
                    ? `${conv.user1.firstName || ""} ${conv.user1.lastName || ""}`.trim() ||
                      "Unknown User"
                    : conv.specialist1?.name || "Unknown Specialist";
                  profileImage = conv.user1
                    ? conv.user1.profileImage
                    : conv.specialist1?.image;
                } else {
                  otherParticipant = null;
                  name = "Unknown Participant";
                  profileImage = undefined;
                }

                const isActive =
                  conv.id === activeConversationId ||
                  pathname === `/dashboard/messaging/${conv.id}`;

                return (
                  <Button
                    key={conv.id}
                    variant="ghost"
                    className={cn(
                      "w-full flex items-center gap-3 p-4 rounded-none h-auto",
                      isActive
                        ? "bg-[#F3CFC6]/20 text-black dark:text-white"
                        : "hover:bg-[#F3CFC6]/10 dark:hover:bg-[#C4C4C4]/10"
                    )}
                    onClick={() => handleConversationClick(conv.id)}
                  >
                    <Avatar className="h-10 w-10 border-2 border-white">
                      <AvatarImage src={profileImage || ""} alt={name} />
                      <AvatarFallback className="bg-[#C4C4C4] text-black">
                        {name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold truncate text-black dark:text-white">
                          {name}
                        </span>
                        {conv.lastMessage && (
                          <span className="text-xs text-[#C4C4C4] whitespace-nowrap">
                            {new Date(
                              conv.lastMessage.createdAt
                            ).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-[#C4C4C4] truncate">
                        {conv.lastMessage?.text || "No messages"}
                      </p>
                    </div>
                    {conv.messageCount > 0 && (
                      <span className="bg-[#F3CFC6] text-black dark:text-white text-xs rounded-full px-2 py-1">
                        {conv.messageCount}
                      </span>
                    )}
                  </Button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ConversationsList;
