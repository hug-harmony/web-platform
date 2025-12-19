"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { motion } from "framer-motion";
import ChatHeader from "@/components/chat/ChatHeader";
import MessageList from "@/components/chat/MessageList";
import MessageInput from "@/components/chat/MessageInput";
import ProposalDialog from "@/components/ProposalDialog";
import ConfirmDialog from "@/components/ConfirmDialog";
import NotesSidebar from "@/components/NotesSidebar";

interface Message {
  senderId: string;
  id: string;
  text: string;
  isAudio: boolean;
  isSystem?: boolean;
  imageUrl?: string;
  createdAt: string;
  sender: { name?: string };
  userId: string;
  proposalId?: string;
  proposalStatus?: string;
  initiator?: string;
}

interface Participant {
  id: string;
  firstName?: string;
  lastName?: string;
  profileImage?: string;
}

interface Conversation {
  id: string;
  user1?: Participant;
  user2?: Participant;
  professionalId?: string; // NEW: From updated backend response
}

interface Professional {
  id: string;
  name: string;
  rate?: number;
}

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
  const { id: conversationId } = useParams();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isProfessional, setIsProfessional] = useState(false);
  const [isProposalDialogOpen, setIsProposalDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<{
    id: string;
    startTime: string; // UPDATED: For range
    endTime: string; // UPDATED
    professional: Professional;
    appointmentId?: string;
  } | null>(null);
  const [proposalActionMessage, setProposalActionMessage] = useState<
    string | null
  >(null);
  const [isNotesSidebarOpen, setIsNotesSidebarOpen] = useState(false);
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const [otherUserType, setOtherUserType] = useState<
    "user" | "professional" | null
  >(null);
  const [professionalId, setProfessionalId] = useState<string | null>(null); // NEW: For ProposalDialog

  useEffect(() => {
    const checkProfessionalStatus = async () => {
      if (!session?.user?.id) return;
      try {
        const res = await fetch("/api/professionals/application/me", {
          cache: "no-store",
          credentials: "include",
        });
        if (res.ok) {
          const { status } = await res.json();
          setIsProfessional(status === "APPROVED");
        }
      } catch (error) {
        console.error("Error checking professional status:", error);
      }
    };
    if (status === "authenticated") checkProfessionalStatus();
  }, [status, session]);

  const fetchMessages = useCallback(async () => {
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
      setMessages(Array.isArray(msgData) ? msgData : []);
    } catch {
      toast.error("Failed to load messages");
    }
  }, [conversationId, status, router]);

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
        setMessages(Array.isArray(msgData) ? msgData : []);

        // Set other user ID and type
        const currentUserId = session.user.id;
        const otherUser =
          convData.user1?.id === currentUserId
            ? convData.user2
            : convData.user1;
        setOtherUserId(otherUser?.id || null);
        setOtherUserType(otherUser?.isProfessional ? "professional" : "user"); // Mock; replace with real logic if available

        // NEW: Set professionalId from conversation response
        setProfessionalId(convData.professionalId || null);
      } catch {
        toast.error("Failed to load conversation or messages");
      } finally {
        setLoading(false);
      }
    };

    fetchConversationAndMessages();

    const pollingInterval = setInterval(fetchMessages, 5000);
    return () => clearInterval(pollingInterval);
  }, [status, conversationId, router, fetchMessages, session]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    } else {
      setImagePreview(null);
    }
  };

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
        setImagePreview(null);
      }
    };
  }, [imagePreview]);

  const handleSend = async () => {
    if (!input.trim() && !imagePreview) {
      toast.error("Please enter a message or select an image");
      return;
    }
    if (!session?.user?.id || !conversation) {
      toast.error("Please log in and enter a message");
      return;
    }

    setSending(true);
    const recipientId =
      conversation.user1?.id === session.user.id
        ? conversation.user2?.id || ""
        : conversation.user1?.id || "";

    try {
      let imageUrl: string | undefined;
      if (imagePreview) {
        const file =
          document.querySelector<HTMLInputElement>("#file-input")?.files?.[0];
        if (file) {
          if (!file.type.startsWith("image/")) {
            throw new Error("Only image files are allowed");
          }
          const maxSize = 5 * 1024 * 1024; // 5MB
          if (file.size > maxSize) {
            throw new Error("File size exceeds 5MB limit");
          }

          const formData = new FormData();
          formData.append("file", file);

          const uploadRes = await fetch("/api/messages/blob-upload", {
            method: "POST",
            body: formData,
            credentials: "include",
          });

          if (!uploadRes.ok) {
            const errorData = await uploadRes.json();
            throw new Error(errorData.error || "Failed to upload image");
          }

          const uploadData = await uploadRes.json();
          imageUrl = uploadData.url;
        }
      }

      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          text: input,
          recipientId,
          imageUrl,
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
      setImagePreview(null);
      await fetchMessages();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to send message";
      toast.error(errorMessage);
    } finally {
      setSending(false);
    }
  };

  const handleSendProposal = async (
    start: Date,
    end: Date,
    venue?: "host" | "visit"
  ) => {
    if (!start || !end) {
      toast.error("Please select a time slot");
      return;
    }
    if (!session?.user?.id || !conversation) {
      toast.error("Please log in to send a proposal");
      return;
    }

    setSending(true);
    const recipientId =
      conversation.user1?.id === session.user.id
        ? conversation.user2?.id || ""
        : conversation.user1?.id || "";

    try {
      const res = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          userId: recipientId,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          venue,
        }),
        credentials: "include",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to send proposal");
      }

      setIsProposalDialogOpen(false);
      toast.success("Proposal sent successfully");
      await fetchMessages();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to send proposal";
      toast.error(errorMessage);
    } finally {
      setSending(false);
    }
  };

  /*
  const handleProposalAction = async (
    proposalId: string,
    action: "accepted" | "rejected"
  ) => {
    if (!session?.user?.id) {
      toast.error("Please log in to respond to the proposal");
      return;
    }

    setSending(true);
    try {
      const res = await fetch(`/api/proposals/${proposalId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action }),
        credentials: "include",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Failed to ${action} proposal`);
      }

      const data = await res.json();

      const proposal = data.proposal as {
        id: string;
        startTime: string; // UPDATED
        endTime: string; // UPDATED
        initiator: "professional" | "client";
        professionalId: string;
      };
      const appointmentId: string | undefined = data.appointmentId;

      setProposalActionMessage(`Proposal ${action}`);
      setTimeout(() => setProposalActionMessage(null), 3000);

      if (action === "accepted") {
        if (proposal.initiator === "professional") {
          const professionalRes = await fetch(
            `/api/professionals/${proposal.professionalId}`,
            {
              cache: "no-store",
              credentials: "include",
            }
          );

          if (!professionalRes.ok) {
            throw new Error(
              `Failed to fetch professional details: ${professionalRes.status}`
            );
          }
          const professional = await professionalRes.json();

          setSelectedProposal({
            id: proposal.id,
            startTime: proposal.startTime, // UPDATED
            endTime: proposal.endTime, // UPDATED
            professional: {
              id: proposal.professionalId,
              name: professional.name,
              rate: professional.rate || 50,
            },
            appointmentId,
          });

          setConfirmDialogOpen(true);
          toast.success("Proposal accepted - proceed to payment");
        } else {
          toast.success("Appointment request accepted");
        }
      } else {
        toast.success(
          proposal.initiator === "professional"
            ? "Proposal rejected"
            : "Appointment request declined"
        );
      }

      await fetchMessages();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : `Failed to ${action} proposal`;
      toast.error(errorMessage);
    } finally {
      setSending(false);
    }
  };
  */

  const handleProposalAction = async (
    proposalId: string,
    action: "accepted" | "rejected"
  ) => {
    if (!session?.user?.id) {
      toast.error("Please log in to respond to the proposal");
      return;
    }

    setSending(true);
    try {
      const res = await fetch(`/api/proposals/${proposalId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action }),
        credentials: "include",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Failed to ${action} proposal`);
      }

      const data = await res.json();

      const proposal = data.proposal as {
        id: string;
        startTime: string;
        endTime: string;
        initiator: "professional" | "user"; // UPDATED: Use "user" as per your code
        professionalId: string;
      };
      const appointmentId: string | undefined = data.appointmentId;

      setProposalActionMessage(`Proposal ${action}`);
      setTimeout(() => setProposalActionMessage(null), 3000);

      if (action === "accepted") {
        if (proposal.initiator === "professional") {
          const professionalRes = await fetch(
            `/api/professionals/${proposal.professionalId}`,
            {
              cache: "no-store",
              credentials: "include",
            }
          );

          if (!professionalRes.ok) {
            throw new Error(
              `Failed to fetch professional details: ${professionalRes.status}`
            );
          }
          const professional = await professionalRes.json();

          setSelectedProposal({
            id: proposal.id,
            startTime: proposal.startTime,
            endTime: proposal.endTime,
            professional: {
              id: proposal.professionalId,
              name: professional.name,
              rate: professional.rate || 50,
            },
            appointmentId,
          });

          setConfirmDialogOpen(true);
          toast.success("Proposal accepted - proceed to payment");
        } else {
          // UPDATED: Tailored toast for user-initiated (request) acceptance
          toast.success("Appointment request accepted");
        }
      } else {
        // UPDATED: Tailored toasts for rejection
        toast.success(
          proposal.initiator === "professional"
            ? "Proposal rejected"
            : "Appointment request declined"
        );
      }

      await fetchMessages();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : `Failed to ${action} proposal`;
      toast.error(errorMessage);
    } finally {
      setSending(false);
    }
  };

  const handlePayNow = () => {
    if (!selectedProposal?.appointmentId) {
      toast.error("No appointment ID found");
      return;
    }
    router.push(
      `/dashboard/appointments/confirm/${selectedProposal.appointmentId}`
    );
    setConfirmDialogOpen(false);
    setSelectedProposal(null);
  };

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
          <CardContent className="p-4 flex-1 overflow-y-auto space-y-2">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}
              >
                <Skeleton className="h-12 w-48 rounded-lg bg-[#C4C4C4]/50" />
              </div>
            ))}
          </CardContent>
          <div className="p-4 border-t flex items-center">
            <Skeleton className="flex-1 h-10 mr-2 bg-[#C4C4C4]/50" />
            <Skeleton className="h-10 w-20 bg-[#C4C4C4]/50" />
          </div>
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
        <Card className="h-[calc(100vh-2rem)] flex flex-col shadow-lg">
          <CardContent className="flex-1 flex items-center justify-center text-[#C4C4C4]">
            Please log in to view messages.
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (!conversation) {
    return (
      <motion.div
        className="p-4 space-y-6 max-w-7xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <Card className="h-[calc(100vh-2rem)] flex flex-col shadow-lg">
          <CardContent className="flex-1 flex items-center justify-center text-[#C4C4C4]">
            Conversation not found.
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  const otherUser =
    conversation.user1?.id === session.user.id
      ? conversation.user2
      : conversation.user1;

  return (
    <motion.div
      className="p-4 space-y-6 max-w-7xl mx-auto relative" // Added relative for sidebar positioning
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Card className="h-[calc(100vh-2rem)] flex flex-col shadow-lg">
        <ChatHeader
          otherUser={otherUser}
          sessionUserId={session.user.id}
          onNotesClick={() => setIsNotesSidebarOpen(true)} // New prop for notes button
        />
        <MessageList
          messages={messages}
          sessionUserId={session.user.id}
          handleProposalAction={handleProposalAction}
          sending={sending}
          proposalActionMessage={proposalActionMessage}
        />
        <MessageInput
          input={input}
          setInput={setInput}
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
        handleSendProposal={handleSendProposal} // UPDATED: Pass the new handler
        sending={sending}
        professionalId={professionalId!} // NEW: Pass professionalId
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
