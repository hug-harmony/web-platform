import React, { useEffect, useRef, useState } from "react";
import { CardContent } from "@/components/ui/card";
import MessageBubble from "./MessageBubble";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  senderId: string;
  id: string;
  text: string;
  isAudio: boolean;
  isSystem?: boolean; // ✅ NEW
  imageUrl?: string;
  createdAt: string;
  sender: { name?: string };
  userId: string;
  proposalId?: string;
  proposalStatus?: string;
}

interface MessageListProps {
  messages: Message[];
  sessionUserId: string;
  handleProposalAction: (
    proposalId: string,
    action: "accepted" | "rejected"
  ) => Promise<void>;
  sending: boolean;
  proposalActionMessage: string | null;
}

const MessageList: React.FC<MessageListProps> = ({
  messages,
  sessionUserId,
  handleProposalAction,
  sending,
  proposalActionMessage,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [newMessageNotification, setNewMessageNotification] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
    if (messages.length > 0) {
      setNewMessageNotification(true);
      const timer = setTimeout(() => setNewMessageNotification(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [messages]);

  return (
    <CardContent className="p-4 flex-1 overflow-y-auto space-y-2 relative">
      <AnimatePresence>
        {newMessageNotification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-2 left-1/2 transform -translate-x-1/2 bg-[#F3CFC6]/80 text-white text-sm px-4 py-2 rounded-full shadow-md z-10"
          >
            New message received
          </motion.div>
        )}
        {proposalActionMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-12 left-1/2 transform -translate-x-1/2 bg-[#D8A7B1]/80 text-white text-sm px-4 py-2 rounded-full shadow-md z-10"
          >
            {proposalActionMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {messages.map((msg) =>
        msg.isSystem ? (
          <div key={msg.id} className="flex justify-center my-2">
            <div
              className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300
                            text-sm italic px-3 py-1 rounded-md max-w-md text-center"
            >
              {msg.text}
            </div>
          </div>
        ) : (
          <MessageBubble
            key={msg.id}
            message={msg}
            isSender={msg.senderId === sessionUserId}
            handleProposalAction={handleProposalAction}
            sending={sending}
          />
        )
      )}

      <div ref={messagesEndRef} />
    </CardContent>
  );
};

export default MessageList;
