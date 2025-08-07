"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format } from "date-fns";

interface Message {
  id: string;
  text: string;
  isAudio: boolean;
  createdAt: string;
  sender: {
    firstName?: string;
    lastName?: string;
  };
  userId: string;
}

interface Conversation {
  id: string;
  user1: {
    id: string;
    firstName?: string;
    lastName?: string;
    profileImage?: string;
  };
  user2: {
    id: string;
    firstName?: string;
    lastName?: string;
    profileImage?: string;
  };
}

const MessageInterface: React.FC = () => {
  const { data: session, status } = useSession();
  const { id: conversationId } = useParams();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    if (!conversationId || status !== "authenticated") return;

    try {
      const msgRes = await fetch(`/api/messages/${conversationId}`, {
        cache: "no-store",
        credentials: "include",
      });

      if (!msgRes.ok) {
        if (msgRes.status === 401) {
          router.push("/login");
          return;
        }
        throw new Error("Failed to fetch messages");
      }

      const msgData = await msgRes.json();
      setMessages(msgData);
    } catch {
      toast.error("Failed to load messages");
    }
  };

  useEffect(() => {
    const fetchConversationAndMessages = async () => {
      if (status !== "authenticated" || !conversationId) return;

      setLoading(true);
      try {
        const [convRes, msgRes] = await Promise.all([
          fetch(`/api/conversations/${conversationId}`, {
            cache: "no-store",
            credentials: "include",
          }),
          fetch(`/api/messages/${conversationId}`, {
            cache: "no-store",
            credentials: "include",
          }),
        ]);

        if (!convRes.ok || !msgRes.ok) {
          if (convRes.status === 401 || msgRes.status === 401) {
            router.push("/login");
            return;
          }
          throw new Error("Failed to fetch data");
        }

        const convData = await convRes.json();
        const msgData = await msgRes.json();

        setConversation(convData);
        setMessages(msgData);
      } catch {
        toast.error("Failed to load conversation or messages");
      } finally {
        setLoading(false);
      }
    };

    fetchConversationAndMessages();

    pollingIntervalRef.current = setInterval(fetchMessages, 5000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [status, conversationId, router]);

  const handleSend = async () => {
    if (!input.trim() || !session?.user?.id || !conversation) {
      toast.error("Please log in and enter a message");
      return;
    }

    setSending(true);
    const recipientId =
      conversation.user1.id === session.user.id
        ? conversation.user2.id
        : conversation.user1.id;

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          text: input,
          recipientId,
        }),
        credentials: "include",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to send message");
      }

      const newMessage = await res.json();
      setMessages((prevMessages) => [...prevMessages, newMessage]);
      setInput("");
      await fetchMessages();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to send message";
      toast.error(errorMessage);
    } finally {
      setSending(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <Card className="w-full h-[calc(100vh-2rem)] flex flex-col">
        <CardHeader className="p-4 border-b">
          <div className="flex items-center space-x-2">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 flex-1 overflow-y-auto space-y-2">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}
            >
              <Skeleton className="h-12 w-48 rounded-lg" />
            </div>
          ))}
        </CardContent>
        <div className="p-4 border-t flex items-center">
          <Skeleton className="flex-1 h-10 mr-2" />
          <Skeleton className="h-10 w-20" />
        </div>
      </Card>
    );
  }

  if (!session) {
    return (
      <Card className="w-full h-[calc(100vh-2rem)] flex flex-col">
        <CardContent className="flex-1 flex items-center justify-center">
          <p>Please log in to view messages.</p>
        </CardContent>
      </Card>
    );
  }

  if (!conversation) {
    return (
      <Card className="w-full h-[calc(100vh-2rem)] flex flex-col">
        <CardContent className="flex-1 flex items-center justify-center">
          <p>Conversation not found.</p>
        </CardContent>
      </Card>
    );
  }

  const otherUser =
    conversation.user1.id === session.user.id
      ? conversation.user2
      : conversation.user1;
  const otherUserName =
    `${otherUser.firstName || ""} ${otherUser.lastName || ""}`.trim() ||
    "Unknown User";
  const initials = otherUserName
    .split(" ")
    .map((n) => n.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Card className="w-full h-[calc(100vh-2rem)] flex flex-col">
      <CardHeader className="p-4 border-b">
        <div className="flex items-center space-x-2">
          <Avatar className="w-10 h-10">
            <AvatarImage src={otherUser.profileImage} alt={otherUserName} />
            <AvatarFallback className="bg-purple-500 text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-2">
            <p className="font-semibold h-4">{otherUserName}</p>
            <p className="text-xs text-gray-500 h-3">Online</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 flex-1 overflow-y-auto space-y-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.userId === session.user.id ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`p-2 rounded-lg max-w-xs h-auto min-h-[3rem] flex flex-col ${
                msg.userId === session.user.id
                  ? "bg-[#F5E6E8] text-black"
                  : "bg-[#D8A7B1] text-white"
              }`}
            >
              {msg.isAudio ? (
                <div className="flex items-center">
                  <span>🎵 Audio</span>
                </div>
              ) : (
                <span className="break-words">{msg.text}</span>
              )}
              <div className="text-xs text-gray-500 mt-1">
                {format(new Date(msg.createdAt), "HH:mm")}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </CardContent>
      <div className="p-4 border-t flex items-center">
        <Input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Write a message..."
          className="flex-1 h-10 mr-2"
          disabled={sending}
        />
        <Button
          onClick={handleSend}
          className="bg-[#D8A7B1] hover:bg-[#C68E9C] text-white h-10 w-20"
          disabled={sending}
        >
          {sending ? <span className="animate-pulse">Sending...</span> : "Send"}
        </Button>
      </div>
    </Card>
  );
};

export default MessageInterface;
