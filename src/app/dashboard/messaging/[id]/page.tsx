"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import ChatHeader from "@/components/ChatHeader";
import MessageList from "@/components/MessageList";
import MessageInput from "@/components/MessageInput";
import ProposalDialog from "@/components/ProposalDialog";
import ConfirmDialog from "@/components/ConfirmDialog";

interface Message {
  senderId: string;
  id: string;
  text: string;
  isAudio: boolean;
  imageUrl?: string;
  createdAt: string;
  sender: { name?: string };
  userId: string;
  proposalId?: string;
  proposalStatus?: string;
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
}

interface Specialist {
  id: string;
  name: string;
  rate?: number;
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
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSpecialist, setIsSpecialist] = useState(false);
  const [isProposalDialogOpen, setIsProposalDialogOpen] = useState(false);
  const [proposalDate, setProposalDate] = useState<Date | undefined>(
    new Date()
  );
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<{
    id: string;
    date: string;
    time: string;
    specialist: Specialist;
    appointmentId?: string;
  } | null>(null);
  const [proposalActionMessage, setProposalActionMessage] = useState<
    string | null
  >(null);

  useEffect(() => {
    const checkSpecialistStatus = async () => {
      if (!session?.user?.id) return;
      try {
        const res = await fetch("/api/specialists/application/me", {
          cache: "no-store",
          credentials: "include",
        });
        if (res.ok) {
          const { status } = await res.json();
          setIsSpecialist(status === "approved");
        }
      } catch (error) {
        console.error("Error checking specialist status:", error);
      }
    };
    if (status === "authenticated") checkSpecialistStatus();
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
      setMessages(msgData);
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
        setMessages(msgData);
      } catch {
        toast.error("Failed to load conversation or messages");
      } finally {
        setLoading(false);
      }
    };

    fetchConversationAndMessages();

    const pollingInterval = setInterval(fetchMessages, 5000);

    return () => {
      clearInterval(pollingInterval);
    };
  }, [status, conversationId, router, fetchMessages]);

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

  const handleSendProposal = async () => {
    if (!proposalDate || !selectedSlots.length) {
      toast.error("Please select a date and at least one time slot");
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
          date: proposalDate.toISOString().split("T")[0],
          time: selectedSlots[0],
        }),
        credentials: "include",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to send proposal");
      }

      setProposalDate(undefined);
      setSelectedSlots([]);
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
      setProposalActionMessage(`Proposal ${action}`); // Set centered message
      setTimeout(() => setProposalActionMessage(null), 3000); // Clear after 3s

      if (action === "accepted") {
        const proposal = data.proposal;
        const appointmentId = data.appointmentId;
        const specialistRes = await fetch(
          `/api/specialists/${proposal.specialistId}`,
          {
            cache: "no-store",
            credentials: "include",
          }
        );
        if (!specialistRes.ok) {
          throw new Error(
            `Failed to fetch specialist details: ${specialistRes.status}`
          );
        }
        const specialist = await specialistRes.json();
        setSelectedProposal({
          id: proposal.id,
          date: proposal.date,
          time: proposal.time,
          specialist: {
            id: proposal.specialistId,
            name: specialist.name,
            rate: specialist.rate || 50,
          },
          appointmentId,
        });
        setConfirmDialogOpen(true);
        toast.success("Proposal accepted");
      } else {
        toast.success("Proposal rejected");
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
      <Card className="px-4 max-w-7xl mx-auto h-[calc(100vh-2rem)] flex flex-col">
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
    conversation.user1?.id === session.user.id
      ? conversation.user2
      : conversation.user1;

  return (
    <div className="px-4 max-w-7xl mx-auto">
      <Card className="w-full h-[calc(100vh-2rem)] flex flex-col">
        <ChatHeader otherUser={otherUser} sessionUserId={session.user.id} />
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
          isSpecialist={isSpecialist}
          setIsProposalDialogOpen={setIsProposalDialogOpen}
        />
      </Card>
      <ProposalDialog
        isOpen={isProposalDialogOpen}
        setIsOpen={setIsProposalDialogOpen}
        proposalDate={proposalDate}
        setProposalDate={setProposalDate}
        selectedSlots={selectedSlots}
        setSelectedSlots={setSelectedSlots}
        handleSendProposal={handleSendProposal}
        sending={sending}
      />
      <ConfirmDialog
        isOpen={confirmDialogOpen}
        setIsOpen={setConfirmDialogOpen}
        selectedProposal={selectedProposal}
        handlePayNow={handlePayNow}
        sending={sending}
        sessionUserName={session.user.name}
      />
    </div>
  );
};

export default MessageInterface;
