// components/chat/MessageInterface.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useWebSocket } from "@/hooks/useWebSocket";
import ChatHeader from "./ChatHeader";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import ProposalDialog from "@/components/ProposalDialog";
import ConfirmDialog from "@/components/ConfirmDialog";
import NotesSidebar from "@/components/NotesSidebar";
import type {
  ChatMessage,
  ConversationWithMessages,
  Participant,
} from "@/types/chat";

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

const MessageInterface: React.FC = () => {
  const { data: session, status } = useSession();
  const { id: conversationId } = useParams<{ id: string }>();
  const router = useRouter();

  // State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [conversation, setConversation] =
    useState<ConversationWithMessages | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isProfessional, setIsProfessional] = useState(false);
  const [isProposalDialogOpen, setIsProposalDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<{
    id: string;
    startTime: string;
    endTime: string;
    professional: { id: string; name: string; rate: number };
    appointmentId?: string;
  } | null>(null);
  const [proposalActionMessage, setProposalActionMessage] = useState<
    string | null
  >(null);
  const [isNotesSidebarOpen, setIsNotesSidebarOpen] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

  // Refs for cleanup
  const typingTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Computed values
  const otherUser: Participant | undefined = conversation
    ? conversation.user1?.id === session?.user?.id
      ? conversation.user2
      : conversation.user1
    : undefined;

  const otherUserId = otherUser?.id || null;
  const professionalId = conversation?.professionalId || null;
  const otherUserType: "user" | "professional" | null =
    otherUser?.isProfessional ? "professional" : "user";

  // WebSocket connection
  const { isConnected, sendTyping } = useWebSocket({
    conversationId,
    enabled: status === "authenticated" && !!conversationId,
    onNewMessage: useCallback((message: ChatMessage) => {
      setMessages((prev) => {
        // Avoid duplicates
        if (prev.some((m) => m.id === message.id)) {
          return prev;
        }
        return [...prev, message];
      });
    }, []),
    onTyping: useCallback(
      (odI: string) => {
        if (odI === session?.user?.id) return;

        setTypingUsers((prev) => new Set(prev).add(userId));

        // Clear existing timeout for this user
        const existingTimeout = typingTimeoutRef.current.get(userId);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
        }

        // Set new timeout to remove typing indicator
        const timeout = setTimeout(() => {
          setTypingUsers((prev) => {
            const next = new Set(prev);
            next.delete(userId);
            return next;
          });
          typingTimeoutRef.current.delete(userId);
        }, 3000);

        typingTimeoutRef.current.set(odI, timeout);
      },
      [session?.user?.id]
    ),
    onConnect: useCallback(() => {
      console.log("Chat connected");
    }, []),
    onDisconnect: useCallback(() => {
      console.log("Chat disconnected");
    }, []),
  });

  // Check professional status
  useEffect(() => {
    const checkProfessionalStatus = async () => {
      if (!session?.user?.id) return;
      try {
        const res = await fetch("/api/professionals/application/me", {
          cache: "no-store",
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setIsProfessional(data.status === "APPROVED");
        }
      } catch (error) {
        console.error("Error checking professional status:", error);
      }
    };

    if (status === "authenticated") {
      checkProfessionalStatus();
    }
  }, [status, session?.user?.id]);

  // Fetch conversation and messages
  const fetchConversationAndMessages = useCallback(async () => {
    if (status !== "authenticated" || !conversationId) return;

    setLoading(true);
    try {
      // Single API call with messages included
      const res = await fetch(
        `/api/conversations/${conversationId}?messages=true&limit=100`,
        {
          cache: "no-store",
          credentials: "include",
        }
      );

      if (!res.ok) {
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        if (res.status === 404) {
          toast.error("Conversation not found");
          router.push("/dashboard/messaging");
          return;
        }
        throw new Error("Failed to fetch conversation");
      }

      const data: ConversationWithMessages = await res.json();
      setConversation(data);
      setMessages(data.messages || []);

      // Mark as read
      fetch(`/api/conversations/${conversationId}`, {
        method: "PATCH",
        credentials: "include",
      }).catch(console.error);
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Failed to load conversation");
    } finally {
      setLoading(false);
    }
  }, [status, conversationId, router]);

  useEffect(() => {
    fetchConversationAndMessages();
  }, [fetchConversationAndMessages]);

  // Cleanup typing timeouts on unmount
  useEffect(() => {
    return () => {
      typingTimeoutRef.current.forEach((timeout) => clearTimeout(timeout));
      typingTimeoutRef.current.clear();
    };
  }, []);

  // Handle input change with typing indicator
  const handleInputChange = useCallback(
    (value: string) => {
      setInput(value);
      if (value.trim()) {
        sendTyping();
      }
    },
    [sendTyping]
  );

  // Handle file selection
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        if (!file.type.startsWith("image/")) {
          toast.error("Only image files are allowed");
          return;
        }
        if (file.size > 5 * 1024 * 1024) {
          toast.error("File size must be less than 5MB");
          return;
        }
        const previewUrl = URL.createObjectURL(file);
        setImagePreview(previewUrl);
      }
    },
    []
  );

  // Cleanup image preview URL
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  // Send message
  const handleSend = useCallback(async () => {
    if (!input.trim() && !imagePreview) {
      toast.error("Please enter a message or select an image");
      return;
    }
    if (!session?.user?.id || !conversation) {
      toast.error("Please log in to send messages");
      return;
    }

    setSending(true);
    const recipientId =
      conversation.userId1 === session.user.id
        ? conversation.userId2
        : conversation.userId1;

    try {
      let imageUrl: string | undefined;

      // Upload image if selected
      if (imagePreview) {
        const fileInput =
          document.querySelector<HTMLInputElement>("#file-input");
        const file = fileInput?.files?.[0];

        if (file) {
          const formData = new FormData();
          formData.append("file", file);

          const uploadRes = await fetch("/api/messages/upload", {
            method: "POST",
            body: formData,
            credentials: "include",
          });

          if (!uploadRes.ok) {
            const error = await uploadRes.json();
            throw new Error(error.error || "Failed to upload image");
          }

          const uploadData = await uploadRes.json();
          imageUrl = uploadData.url;
        }
      }

      // Send message
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          text: input.trim(),
          recipientId,
          imageUrl,
        }),
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to send message");
      }

      const newMessage: ChatMessage = await res.json();

      // Add to local state immediately (WebSocket will also send it, but we handle duplicates)
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMessage.id)) {
          return prev;
        }
        return [...prev, newMessage];
      });

      // Clear inputs
      setInput("");
      setImagePreview(null);
      const fileInput = document.querySelector<HTMLInputElement>("#file-input");
      if (fileInput) fileInput.value = "";
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to send message";
      toast.error(message);
    } finally {
      setSending(false);
    }
  }, [input, imagePreview, session?.user?.id, conversation, conversationId]);

  // Send proposal
  const handleSendProposal = useCallback(
    async (start: Date, end: Date, venue?: "host" | "visit") => {
      if (!session?.user?.id || !conversation) {
        toast.error("Please log in to send a proposal");
        return;
      }

      setSending(true);
      const recipientId =
        conversation.userId1 === session.user.id
          ? conversation.userId2
          : conversation.userId1;

      try {
        const res = await fetch("/api/proposals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId,
            userId: recipientId,
            professionalId: professionalId,
            startTime: start.toISOString(),
            endTime: end.toISOString(),
            venue,
          }),
          credentials: "include",
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || "Failed to send proposal");
        }

        setIsProposalDialogOpen(false);
        toast.success("Proposal sent successfully");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to send proposal";
        toast.error(message);
      } finally {
        setSending(false);
      }
    },
    [session?.user?.id, conversation, conversationId, professionalId]
  );

  // Handle proposal action (accept/reject)
  const handleProposalAction = useCallback(
    async (proposalId: string, action: "accepted" | "rejected") => {
      if (!session?.user?.id) {
        toast.error("Please log in to respond to the proposal");
        return;
      }

      setSending(true);
      try {
        const res = await fetch(`/api/proposals/${proposalId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: action }),
          credentials: "include",
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || `Failed to ${action} proposal`);
        }

        const data = await res.json();

        setProposalActionMessage(`Proposal ${action}`);
        setTimeout(() => setProposalActionMessage(null), 3000);

        if (
          action === "accepted" &&
          data.proposal.initiator === "professional"
        ) {
          // User accepted professional's proposal - show payment dialog
          const professionalRes = await fetch(
            `/api/professionals/${data.proposal.professionalId}`,
            { credentials: "include" }
          );

          if (professionalRes.ok) {
            const professional = await professionalRes.json();
            setSelectedProposal({
              id: data.proposal.id,
              startTime: data.proposal.startTime,
              endTime: data.proposal.endTime,
              professional: {
                id: data.proposal.professionalId,
                name: professional.name,
                rate: professional.rate || 50,
              },
              appointmentId: data.appointmentId,
            });
            setConfirmDialogOpen(true);
            toast.success("Proposal accepted - proceed to payment");
          }
        } else if (action === "accepted") {
          toast.success("Appointment request accepted");
        } else {
          toast.success(
            data.proposal.initiator === "professional"
              ? "Proposal rejected"
              : "Appointment request declined"
          );
        }

        // Refresh messages to update proposal status
        fetchConversationAndMessages();
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : `Failed to ${action} proposal`;
        toast.error(message);
      } finally {
        setSending(false);
      }
    },
    [session?.user?.id, fetchConversationAndMessages]
  );

  // Handle payment navigation
  const handlePayNow = useCallback(() => {
    if (!selectedProposal?.appointmentId) {
      toast.error("No appointment ID found");
      return;
    }
    router.push(
      `/dashboard/appointments/confirm/${selectedProposal.appointmentId}`
    );
    setConfirmDialogOpen(false);
    setSelectedProposal(null);
  }, [selectedProposal, router]);

  // Loading state
  if (status === "loading" || loading) {
    return (
      <motion.div
        className="p-4 space-y-6 max-w-7xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <Card className="h-[calc(100vh-2rem)] flex flex-col shadow-lg">
          <Skeleton className="p-4 border-b h-16 bg-[#F3CFC6]/20" />
          <div className="p-4 flex-1 overflow-y-auto space-y-2">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}
              >
                <Skeleton className="h-12 w-48 rounded-lg bg-[#C4C4C4]/50" />
              </div>
            ))}
          </div>
          <div className="p-4 border-t flex items-center">
            <Skeleton className="flex-1 h-10 mr-2 bg-[#C4C4C4]/50" />
            <Skeleton className="h-10 w-20 bg-[#C4C4C4]/50" />
          </div>
        </Card>
      </motion.div>
    );
  }

  // Unauthenticated state
  if (!session) {
    return (
      <motion.div
        className="p-4 space-y-6 max-w-7xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <Card className="h-[calc(100vh-2rem)] flex flex-col shadow-lg">
          <div className="flex-1 flex items-center justify-center text-[#C4C4C4]">
            Please log in to view messages.
          </div>
        </Card>
      </motion.div>
    );
  }

  // Conversation not found state
  if (!conversation) {
    return (
      <motion.div
        className="p-4 space-y-6 max-w-7xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <Card className="h-[calc(100vh-2rem)] flex flex-col shadow-lg">
          <div className="flex-1 flex items-center justify-center text-[#C4C4C4]">
            Conversation not found.
          </div>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="p-4 space-y-6 max-w-7xl mx-auto relative"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Card className="h-[calc(100vh-2rem)] flex flex-col shadow-lg">
        <ChatHeader
          otherUser={otherUser}
          sessionUserId={session.user.id}
          onNotesClick={() => setIsNotesSidebarOpen(true)}
          isConnected={isConnected}
        />
        <MessageList
          messages={messages}
          sessionUserId={session.user.id}
          handleProposalAction={handleProposalAction}
          sending={sending}
          proposalActionMessage={proposalActionMessage}
          typingUsers={typingUsers}
        />
        <MessageInput
          input={input}
          setInput={handleInputChange}
          imagePreview={imagePreview}
          setImagePreview={setImagePreview}
          handleSend={handleSend}
          handleFileChange={handleFileChange}
          sending={sending}
          isProfessional={isProfessional}
          setIsProposalDialogOpen={setIsProposalDialogOpen}
        />
      </Card>

      <NotesSidebar
        isOpen={isNotesSidebarOpen}
        onClose={() => setIsNotesSidebarOpen(false)}
        targetId={otherUserId}
        targetType={otherUserType}
      />

      <ProposalDialog
        isOpen={isProposalDialogOpen}
        setIsOpen={setIsProposalDialogOpen}
        handleSendProposal={handleSendProposal}
        sending={sending}
        professionalId={professionalId!}
      />

      <ConfirmDialog
        isOpen={confirmDialogOpen}
        setIsOpen={setConfirmDialogOpen}
        selectedProposal={selectedProposal}
        handlePayNow={handlePayNow}
        sending={sending}
        sessionUserName={session.user.name}
      />
    </motion.div>
  );
};

export default MessageInterface;
