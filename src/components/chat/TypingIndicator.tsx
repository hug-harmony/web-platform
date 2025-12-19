// components/chat/TypingIndicator.tsx
import React from "react";
import { motion } from "framer-motion";

interface TypingIndicatorProps {
  userCount?: number;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ userCount = 1 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex items-center space-x-2 px-4 py-2"
    >
      <div className="flex space-x-1">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-2 h-2 bg-[#C4C4C4] rounded-full"
            animate={{
              y: [0, -6, 0],
            }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.15,
            }}
          />
        ))}
      </div>
      <span className="text-sm text-[#C4C4C4]">
        {userCount === 1 ? "typing..." : `${userCount} people typing...`}
      </span>
    </motion.div>
  );
};

export default TypingIndicator;
