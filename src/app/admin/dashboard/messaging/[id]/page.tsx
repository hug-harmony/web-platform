// src\app\admin\dashboard\messaging\[id]\page.tsx
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
import MessageBubble from "@/components/chat/MessageBubble";
import type { ChatMessage } from "@/types/chat";

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

interface ApiMessage {
  id: string;
  text: string;
  imageUrl?: string;
  createdAt: string | Date;
  senderId: string;
  userId: string;
  sender: {
    name?: string;
    profileImage?: string | null;
    isProfessional?: boolean;
    userId?: string | null;
  };
  isAudio: boolean;
  isSystem?: boolean;
  proposalId?: string;
  proposalStatus?: string;
  initiator?: "user" | "professional";
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

function toChatMessage(msg: ApiMessage, conversationId: string): ChatMessage {
  return {
    id: msg.id,
    text: msg.text,
    imageUrl: msg.imageUrl || null,
    createdAt:
      msg.createdAt instanceof Date
        ? msg.createdAt.toISOString()
        : msg.createdAt,
    senderId: msg.senderId,
    userId: msg.userId,
    isAudio: msg.isAudio,
    isSystem: msg.isSystem,
    proposalId: msg.proposalId || null,
    proposalStatus: msg.proposalStatus || null,
    initiator: msg.initiator || null,
    conversationId,
    sender: {
      name: msg.sender?.name || "Unknown",
      profileImage: msg.sender?.profileImage || null,
      isProfessional: msg.sender?.isProfessional || false,
      userId: msg.sender?.userId || null,
    },
  };
}

export default function ConversationDetailPage() {
  const { id } = useParams();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      try {
        setLoading(true);

        const convResponse = await fetch(`/api/conversations/${id}`);
        if (!convResponse.ok) {
          throw new Error("Failed to fetch conversation");
        }
        const convData = await convResponse.json();
        setConversation(convData);

        const msgResponse = await fetch(`/api/messages/${id}`);
        if (!msgResponse.ok) {
          throw new Error("Failed to fetch messages");
        }
        const msgData: ApiMessage[] = await msgResponse.json();

        setMessages(msgData.map((msg) => toChatMessage(msg, id as string)));
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load conversation data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleProposalAction = async (
    _proposalId: string,
    _action: "accepted" | "rejected"
  ) => {
    console.log("Admin proposal action attempted:", _proposalId, _action);
    toast.info("Proposal actions are not available in admin view");
  };

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="p-4 text-center text-[#C4C4C4]">
        Conversation not found
      </div>
    );
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
        <span className="truncate max-w-[200px]">{conversation.id}</span>
      </div>

      {/* Conversation Summary */}
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] text-black dark:text-white shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-4">
            <MessageCircle className="h-16 w-16 flex-shrink-0" />
            <div>
              <CardTitle className="text-2xl font-bold">
                Conversation between {conversation.user1.firstName}{" "}
                {conversation.user1.lastName} and {conversation.user2.firstName}{" "}
                {conversation.user2.lastName}
              </CardTitle>
              <p className="text-sm opacity-80">
                {messages.length} message{messages.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Messages */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <div className="p-4 space-y-2">
              <AnimatePresence>
                {messages.length > 0 ? (
                  messages.map((msg) => (
                    <motion.div key={msg.id} variants={itemVariants}>
                      <MessageBubble
                        message={msg}
                        isSender={false}
                        handleProposalAction={handleProposalAction}
                        sending={false}
                        onEdit={() => {}}
                        onDelete={() => {}}
                      />
                    </motion.div>
                  ))
                ) : (
                  <div className="p-4 text-center text-[#C4C4C4]">
                    No messages found
                  </div>
                )}
              </AnimatePresence>
            </div>
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
