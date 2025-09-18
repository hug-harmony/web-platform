/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { MessageCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import MessageBubble from "@/components/MessageBubble";

interface Conversation {
  id: string;
  user1: {
    id: string;
    firstName: string;
    lastName: string;
    profileImage?: string;
  };
  user2: {
    id: string;
    firstName: string;
    lastName: string;
    profileImage?: string;
  };
}

interface Message {
  id: string;
  text: string;
  imageUrl?: string;
  createdAt: string | Date; // Allow string or Date
  senderId: string;
  userId: string;
  sender: { name: string };
  isAudio: boolean;
  proposalId?: string;
  proposalStatus?: string;
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

export default function ConversationDetailPage() {
  const { id } = useParams();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch conversation
        const convResponse = await fetch(`/api/conversations/${id}`);
        if (!convResponse.ok) {
          throw new Error("Failed to fetch conversation");
        }
        const convData = await convResponse.json();
        setConversation(convData);

        // Fetch messages
        const msgResponse = await fetch(`/api/messages/${id}`);
        if (!msgResponse.ok) {
          throw new Error("Failed to fetch messages");
        }
        const msgData = await msgResponse.json();
        // Ensure createdAt is a Date object
        setMessages(
          msgData.map((msg: Message) => ({
            ...msg,
            createdAt:
              typeof msg.createdAt === "string"
                ? new Date(msg.createdAt)
                : msg.createdAt,
          }))
        );
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load conversation data");
      } finally {
        setLoading(false);
      }
    };
    if (id) {
      fetchData();
    }
  }, [id]);

  // Mock handleProposalAction for admin view (no-op since admin is read-only)
  const handleProposalAction = async (
    proposalId: string,
    action: "accepted" | "rejected"
  ) => {
    // Admin cannot take actions, so this is a no-op
    toast.info("Proposal actions are not available in admin view");
  };

  if (loading) {
    return <div className="p-4 text-center">Loading...</div>;
  }

  if (!conversation) {
    return <div className="p-4 text-center">Conversation not found</div>;
  }

  return (
    <motion.div
      className="space-y-6 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[#C4C4C4]">
        <Link
          href="/admin/dashboard/messaging"
          className="hover:text-[#F3CFC6]"
        >
          Conversations
        </Link>
        <span>/</span>
        <span>{conversation.id}</span>
      </div>

      {/* Conversation Summary */}
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] text-black dark:text-white shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-4">
            <MessageCircle className="h-16 w-16" />
            <div>
              <CardTitle className="text-2xl font-bold flex items-center">
                Conversation between {conversation.user1.firstName}{" "}
                {conversation.user1.lastName} and {conversation.user2.firstName}{" "}
                {conversation.user2.lastName}
              </CardTitle>
              <p className="text-sm opacity-80">Message History</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Messages */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <AnimatePresence>
              {messages.length > 0 ? (
                messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    variants={itemVariants}
                    className="p-4"
                  >
                    <MessageBubble
                      message={{
                        ...msg,
                        createdAt:
                          msg.createdAt instanceof Date
                            ? msg.createdAt.toISOString()
                            : msg.createdAt, // Handle both Date and string
                      }}
                      isSender={false} // Admin view, no "own" sender
                      handleProposalAction={handleProposalAction}
                      sending={false} // No sending state in admin view
                    />
                  </motion.div>
                ))
              ) : (
                <div className="p-4 text-center text-[#C4C4C4]">
                  No messages found
                </div>
              )}
            </AnimatePresence>
          </ScrollArea>
        </CardContent>
      </Card>

      <Button
        asChild
        variant="link"
        className="text-[#F3CFC6] hover:text-[#F3CFC6]/80"
      >
        <Link href="/admin/dashboard/messaging">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Conversations
        </Link>
      </Button>
    </motion.div>
  );
}
