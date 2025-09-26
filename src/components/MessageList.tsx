import React, { useEffect, useRef, useState } from "react";
import { CardContent } from "@/components/ui/card";
import MessageBubble from "./MessageBubble";
import { motion, AnimatePresence } from "framer-motion";

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

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

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
    <CardContent className="p-4 sm:p-6 flex-1 overflow-y-auto space-y-4 relative">
      <AnimatePresence>
        {newMessageNotification && (
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="absolute top-2 left-1/2 transform -translate-x-1/2 bg-[#F3CFC6]/80 text-black dark:text-white text-sm px-4 py-2 rounded-full shadow-md z-10"
          >
            New message received
          </motion.div>
        )}
        {proposalActionMessage && (
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="absolute top-12 left-1/2 transform -translate-x-1/2 bg-[#F3CFC6]/80 text-black dark:text-white text-sm px-4 py-2 rounded-full shadow-md z-10"
          >
            {proposalActionMessage}
          </motion.div>
        )}
        {messages.map((msg) =>
          msg.isSystem ? (
            <motion.div
              key={msg.id}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              className="flex justify-center my-2"
            >
              <div className="bg-[#C4C4C4]/20 dark:bg-[#C4C4C4]/20 text-[#C4C4C4] text-sm italic px-3 py-1 rounded-md max-w-md text-center">
                {msg.text}
              </div>
            </motion.div>
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
      </AnimatePresence>
      <div ref={messagesEndRef} />
    </CardContent>
  );
};

export default MessageList;
