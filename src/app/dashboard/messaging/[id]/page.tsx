"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format } from "date-fns";
import Image from "next/image";
import { ImageIcon, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";

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
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allSlots = Array.from({ length: 13 }, (_, i) => `${i + 8}:00`);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
      console.log("Messages:", msgData);
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

    pollingIntervalRef.current = setInterval(fetchMessages, 5000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
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
    if (!input.trim() && !fileInputRef.current?.files?.[0]) {
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
        ? conversation.user2?.id || conversation.user2?.id
        : conversation.user1?.id || conversation.user1?.id || "";

    try {
      let imageUrl: string | undefined;
      if (fileInputRef.current?.files?.[0]) {
        const file = fileInputRef.current.files[0];
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
      if (fileInputRef.current) fileInputRef.current.value = "";
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
        ? conversation.user2?.id || conversation.user2?.id
        : conversation.user1?.id || conversation.user1?.id;

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
    action: "accept" | "reject"
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
      if (action === "accept") {
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
      } else {
        toast.success("Proposal rejected");
        await fetchMessages();
      }
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

  const toggleSlot = (time: string) => {
    setSelectedSlots((prev) => (prev.includes(time) ? [] : [time]));
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

  const otherUserName = otherUser
    ? `${otherUser.firstName || ""} ${otherUser.lastName || ""}`.trim() ||
      "Unknown User"
    : "Unknown User";
  const profileImage = otherUser?.profileImage;
  const initials = otherUserName
    .split(" ")
    .map((n) => n.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="px-4 max-w-7xl mx-auto">
      <Card className="w-full h-[calc(100vh-2rem)] flex flex-col">
        <CardHeader className="p-4 border-b flex flex-row justify-between items-center">
          <div className="flex items-center space-x-2">
            <Avatar className="w-10 h-10">
              <AvatarImage src={profileImage} alt={otherUserName} />
              <AvatarFallback className="bg-purple-500 text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <p className="font-semibold h-4">{otherUserName}</p>
              <p className="text-xs text-gray-500 h-3">Online</p>
            </div>
          </div>
          {isSpecialist && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsProposalDialogOpen(true)}
              className="h-8 w-8 text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#F3CFC6]/20"
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-4 flex-1 overflow-y-auto space-y-2">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.senderId === session.user.id ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`p-2 rounded-lg max-w-xs h-auto min-h-[3rem] flex flex-col gap-4 ${
                  msg.senderId === session.user.id
                    ? "bg-primary/10 text-foreground"
                    : "bg-[#FCF0ED] text-black"
                }`}
              >
                {msg.isAudio ? (
                  <div className="flex items-center">
                    <span>🎵 Audio</span>
                  </div>
                ) : msg.imageUrl ? (
                  <div className="relative w-full max-w-xs h-48">
                    <Image
                      src={msg.imageUrl}
                      alt={`Image sent by ${msg.sender.name || "user"} at ${format(new Date(msg.createdAt), "HH:mm")}`}
                      width={200}
                      height={200}
                      className="rounded-lg object-cover"
                      priority={false}
                      onError={() => toast.error("Failed to load image")}
                    />
                  </div>
                ) : (
                  <>
                    <span className="break-words">{msg.text}</span>
                    {msg.proposalId && msg.senderId !== session.user.id && (
                      <div className="flex space-x-2 mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleProposalAction(msg.proposalId!, "accept")
                          }
                          disabled={sending}
                          className="text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#F3CFC6]/20"
                        >
                          Accept
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleProposalAction(msg.proposalId!, "reject")
                          }
                          disabled={sending}
                          className="text-red-500 border-red-500 hover:bg-red-500/20"
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </>
                )}
                <div className="text-xs text-gray-500 mt-1">
                  {format(new Date(msg.createdAt), "HH:mm")}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </CardContent>
        <div className="p-4 border-t flex flex-col space-y-2">
          {imagePreview && (
            <div className="relative w-32 h-32">
              <Image
                src={imagePreview}
                alt="Image preview"
                width={128}
                height={128}
                className="rounded-lg object-cover"
              />
              <button
                onClick={() => {
                  setImagePreview(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
              >
                X
              </button>
            </div>
          )}
          <div className="flex items-center space-x-2">
            <Input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Write a message..."
              className="flex-1 h-10"
              disabled={sending || !!imagePreview}
            />
            <label htmlFor="file-input" className="cursor-pointer">
              <ImageIcon className="h-10 w-10 text-gray-500" />
              <Input
                id="file-input"
                type="file"
                accept="image/*"
                ref={fileInputRef}
                className="hidden"
                disabled={sending}
                onChange={handleFileChange}
              />
            </label>
            <Button
              onClick={handleSend}
              className="bg-[#D8A7B1] hover:bg-[#C68E9C] text-white h-10 w-20"
              disabled={sending}
            >
              {sending ? (
                <span className="animate-pulse">Sending...</span>
              ) : (
                "Send"
              )}
            </Button>
          </div>
        </div>
      </Card>

      <div className="flex flex-col">
        <Dialog
          open={isProposalDialogOpen}
          onOpenChange={setIsProposalDialogOpen}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send Session Proposal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 flex flex-row">
              <div>
                <Label>Date</Label>
                <Calendar
                  mode="single"
                  selected={proposalDate}
                  onSelect={setProposalDate}
                  className="rounded-md border-[#F3CFC6]"
                />
              </div>
              <div>
                <Label>Available Times</Label>
                <div className="grid grid-cols-3 gap-1">
                  {allSlots.map((time) => (
                    <div
                      key={time}
                      className="flex items-center space-x-2 mt-10"
                    >
                      <Checkbox
                        id={time}
                        checked={selectedSlots.includes(time)}
                        onCheckedChange={() => toggleSlot(time)}
                      />
                      <Label htmlFor={time}>{time}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsProposalDialogOpen(false)}
                className="text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#F3CFC6]/20"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendProposal}
                disabled={sending || !proposalDate || !selectedSlots.length}
                className="bg-[#D8A7B1] hover:bg-[#C68E9C] text-white"
              >
                {sending ? "Sending..." : "Send Proposal"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="bg-white dark:bg-gray-800">
          <DialogTitle className="text-black dark:text-white">
            Confirm Booking
          </DialogTitle>
          <div className="py-2 space-y-2">
            <p className="text-black dark:text-white">
              <strong>Name:</strong> {session?.user?.name || "N/A"}
            </p>
            <p className="text-black dark:text-white">
              <strong>Specialist:</strong>{" "}
              {selectedProposal?.specialist.name || "N/A"}
            </p>
            <p className="text-black dark:text-white">
              <strong>Date:</strong>{" "}
              {selectedProposal?.date
                ? format(new Date(selectedProposal.date), "MMMM d, yyyy")
                : "N/A"}
            </p>
            <p className="text-black dark:text-white">
              <strong>Time:</strong> {selectedProposal?.time || "N/A"}
            </p>
            <p className="text-black dark:text-white">
              <strong>Amount:</strong> $
              {selectedProposal?.specialist.rate?.toFixed(2) || "50.00"}
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialogOpen(false)}
              className="text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#F3CFC6]/20"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePayNow}
              className="bg-[#F3CFC6] hover:bg-[#C4C4C4] text-black dark:text-white rounded-full"
              disabled={sending}
            >
              Pay Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MessageInterface;
