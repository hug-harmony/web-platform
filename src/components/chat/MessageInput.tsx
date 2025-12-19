// components/chat/MessageInput.tsx
import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { ImageIcon, Plus, Send, X } from "lucide-react";

interface MessageInputProps {
  input: string;
  setInput: (value: string) => void;
  imagePreview: string | null;
  setImagePreview: (value: string | null) => void;
  handleSend: () => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  sending: boolean;
  isProfessional: boolean;
  setIsProposalDialogOpen: (value: boolean) => void;
}

const MessageInput: React.FC<MessageInputProps> = ({
  input,
  setInput,
  imagePreview,
  setImagePreview,
  handleSend,
  handleFileChange,
  sending,
  isProfessional,
  setIsProposalDialogOpen,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearImagePreview = () => {
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="p-4 sm:p-6 border-t flex flex-col space-y-4 bg-[#F3CFC6]/10 dark:bg-[#C4C4C4]/10">
      {/* Image preview */}
      {imagePreview && (
        <div className="relative w-32 h-32 group">
          <Image
            src={imagePreview}
            alt="Image preview"
            width={128}
            height={128}
            className="rounded-lg object-cover w-full h-full"
          />
          <button
            onClick={clearImagePreview}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
            aria-label="Remove image"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Input row */}
      <div className="flex items-center space-x-2 w-full">
        {/* Proposal button (professionals only) */}
        {isProfessional && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsProposalDialogOpen(true)}
            className="h-10 w-10 rounded-full border-[#F3CFC6] text-[#F3CFC6] hover:bg-[#F3CFC6]/10 dark:hover:bg-[#C4C4C4]/20 flex-shrink-0"
            title="Send proposal"
          >
            <Plus className="h-5 w-5" />
          </Button>
        )}

        {/* Image upload button */}
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 rounded-full border-[#F3CFC6] text-[#F3CFC6] hover:bg-[#F3CFC6]/10 dark:hover:bg-[#C4C4C4]/20 flex-shrink-0"
          onClick={() => fileInputRef.current?.click()}
          disabled={sending}
          title="Attach image"
        >
          <ImageIcon className="h-5 w-5" />
        </Button>
        <input
          id="file-input"
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          ref={fileInputRef}
          className="hidden"
          disabled={sending}
          onChange={handleFileChange}
        />

        {/* Text input */}
        <Input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={imagePreview ? "Add a caption..." : "Write a message..."}
          className="flex-1 h-10 border-[#F3CFC6] text-black dark:text-white focus:ring-[#F3CFC6]"
          disabled={sending}
        />

        {/* Send button */}
        <Button
          onClick={handleSend}
          className="h-10 w-10 sm:w-auto sm:px-4 rounded-full sm:rounded-xl bg-[#F3CFC6] hover:bg-[#D8A7B1] text-black dark:text-white flex items-center justify-center flex-shrink-0"
          disabled={sending || (!input.trim() && !imagePreview)}
        >
          {sending ? (
            <span className="animate-pulse text-sm">...</span>
          ) : (
            <>
              <Send className="h-5 w-5 sm:mr-1" />
              <span className="hidden sm:inline">Send</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default MessageInput;
