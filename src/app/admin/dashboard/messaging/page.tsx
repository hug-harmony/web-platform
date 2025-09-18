"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { MessageCircle, Search } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";

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
  lastMessage?: { text: string; createdAt: Date };
  messageCount: number;
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

export default function MessagingPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/conversations");
        if (!response.ok) {
          throw new Error("Failed to fetch conversations");
        }
        const data = await response.json();
        setConversations(data);
      } catch (error) {
        console.error("Error fetching conversations:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchConversations();
  }, []);

  const filteredConversations = conversations.filter((conv) => {
    const participantNames =
      `${conv.user1.firstName} ${conv.user1.lastName} ${conv.user2.firstName} ${conv.user2.lastName}`.toLowerCase();
    return participantNames.includes(searchTerm.toLowerCase());
  });

  return (
    <motion.div
      className="space-y-6 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] text-black dark:text-white shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl font-bold">
            <MessageCircle className="mr-2 h-6 w-6" />
            Messaging Oversight
          </CardTitle>
          <p className="text-sm opacity-80">
            Monitor conversations between users.
          </p>
        </CardHeader>
      </Card>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#C4C4C4]" />
          <Input
            placeholder="Search by participant names..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 border-[#C4C4C4] focus:ring-[#F3CFC6] dark:bg-black dark:text-white dark:border-[#C4C4C4]"
            aria-label="Search conversations"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            {loading ? (
              <div className="p-4 text-center">Loading...</div>
            ) : (
              <div className="divide-y divide-[#C4C4C4]">
                <AnimatePresence>
                  {filteredConversations.map((conv) => (
                    <motion.div
                      key={conv.id}
                      variants={itemVariants}
                      initial="hidden"
                      animate="visible"
                      exit={{ opacity: 0, x: -20 }}
                      className="flex items-center justify-between p-4 hover:bg-[#F3CFC6]/10 dark:hover:bg-[#C4C4C4]/10 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                          <p className="font-semibold text-black dark:text-white">
                            {conv.user1.firstName} {conv.user1.lastName} ↔{" "}
                            {conv.user2.firstName} {conv.user2.lastName}
                          </p>
                          <p className="text-sm text-[#C4C4C4]">
                            Last message:{" "}
                            {conv.lastMessage?.text?.slice(0, 30) ||
                              "No messages"}
                            ... • Messages: {conv.messageCount}
                          </p>
                        </div>
                      </div>
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="border-[#F3CFC6] text-[#F3CFC6] hover:bg-[#F3CFC6]/20"
                      >
                        <Link href={`/admin/dashboard/messaging/${conv.id}`}>
                          View
                        </Link>
                      </Button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  );
}
