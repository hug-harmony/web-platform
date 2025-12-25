// src/components/chat/MessageList.tsx
import React, { useEffect, useRef } from "react";
import { CardContent } from "@/components/ui/card";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import { motion, AnimatePresence } from "framer-motion";
import type { ChatMessage } from "@/types/chat";

interface MessageListProps {
  messages: ChatMessage[];
  sessionUserId: string;
  handleProposalAction: (
    proposalId: string,
    action: "accepted" | "rejected"
  ) => Promise<void>;
  sending: boolean;
  proposalActionMessage: string | null;
  typingUsers?: Set<string>;
  onEdit: (message: ChatMessage) => void;
  onDelete: (messageId: string) => void;
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
  typingUsers = new Set(),
  onEdit,
  onDelete,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(messages.length);

  // Smart scroll - only scroll to bottom for new messages
  useEffect(() => {
    const isNewMessage = messages.length > prevMessagesLengthRef.current;
    prevMessagesLengthRef.current = messages.length;

    if (isNewMessage && messagesEndRef.current) {
      // Check if user is near bottom before auto-scrolling
      const container = containerRef.current;
      if (container) {
        const isNearBottom =
          container.scrollHeight -
            container.scrollTop -
            container.clientHeight <
          100;

        if (isNearBottom) {
          messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
      }
    }
  }, [messages.length]);

  // Initial scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView();
  }, []);

  return (
    <CardContent
      ref={containerRef}
      className="p-4 sm:p-6 flex-1 overflow-y-auto space-y-4 relative"
    >
      <AnimatePresence>
        {/* Proposal action notification */}
        {proposalActionMessage && (
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="sticky top-2 left-1/2 transform -translate-x-1/2 bg-[#F3CFC6]/90 backdrop-blur-sm text-black dark:text-white text-sm px-4 py-2 rounded-full shadow-md z-10 w-fit mx-auto"
          >
            {proposalActionMessage}
          </motion.div>
        )}

        {/* Empty state */}
        {messages.length === 0 && (
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col items-center justify-center h-full text-center py-12"
          >
            <div className="w-16 h-16 bg-[#F3CFC6]/20 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">💬</span>
            </div>
            <p className="text-[#C4C4C4] text-sm">No messages yet.</p>
            <p className="text-[#C4C4C4] text-xs mt-1">
              Start the conversation!
            </p>
          </motion.div>
        )}

        {/* Messages */}
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
              currentUserId={sessionUserId}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          )
        )}

        {/* Typing indicator */}
        {typingUsers.size > 0 && (
          <TypingIndicator userCount={typingUsers.size} />
        )}
      </AnimatePresence>

      <div ref={messagesEndRef} />
    </CardContent>
  );
};

export default MessageList;
