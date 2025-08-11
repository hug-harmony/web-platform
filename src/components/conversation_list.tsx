"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
      <Card className="w-full h-full flex flex-col">
        <CardHeader>
          <CardTitle>Conversations</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-2">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-3/4" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!session) {
    return (
      <Card className="w-full h-full flex flex-col">
        <CardContent className="flex-1 flex items-center justify-center">
          <p>Please log in to view conversations.</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full h-full flex flex-col">
        <CardContent className="flex-1 flex items-center justify-center">
          <p className="text-red-500">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader className="border-b">
        <CardTitle>Conversations</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-0">
        {conversations.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-gray-500">No conversations found.</p>
          </div>
        ) : (
          <div className="divide-y">
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
                    isActive ? "bg-[#F5E6E8] text-black" : "hover:bg-gray-100"
                  )}
                  onClick={() => handleConversationClick(conv.id)}
                >
                  <Avatar
                    className="h-10 w-10"
                    onClick={() => {
                      if (otherParticipant?.id) {
                        router.push(`/dashboard/users/${otherParticipant.id}`);
                      }
                    }}
                  >
                    <AvatarImage src={profileImage || ""} alt={name} />
                    <AvatarFallback>{name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold truncate">{name}</span>
                      {conv.lastMessage && (
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          {new Date(
                            conv.lastMessage.createdAt
                          ).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 truncate">
                      {conv.lastMessage?.text || "No messages"}
                    </p>
                  </div>
                  {conv.messageCount > 0 && (
                    <span className="bg-[#D8A7B1] text-white text-xs rounded-full px-2 py-1">
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
  );
};

export default ConversationsList;
