import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { ImageIcon, Plus, Send } from "lucide-react";

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

  return (
    <div className="p-4 sm:p-6 border-t flex flex-col space-y-4 bg-[#F3CFC6]/10 dark:bg-[#C4C4C4]/10">
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

      <div className="flex items-center space-x-2 w-full">
        {isProfessional && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsProposalDialogOpen(true)}
            className="h-10 w-10 rounded-full border-[#F3CFC6] text-[#F3CFC6] hover:bg-[#F3CFC6]/10 dark:hover:bg-[#C4C4C4]/20"
          >
            <Plus className="h-5 w-5" />
          </Button>
        )}

        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 rounded-full border-[#F3CFC6] text-[#F3CFC6] hover:bg-[#F3CFC6]/10 dark:hover:bg-[#C4C4C4]/20"
          onClick={() => fileInputRef.current?.click()}
          disabled={sending}
        >
          <ImageIcon className="h-5 w-5" />
          <Input
            id="file-input"
            type="file"
            accept="image/*"
            ref={fileInputRef}
            className="hidden"
            disabled={sending}
            onChange={handleFileChange}
          />
        </Button>

        <Input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Write a message..."
          className="flex-1 h-10 border-[#F3CFC6] text-black dark:text-white focus:ring-[#F3CFC6]"
          disabled={sending || !!imagePreview}
        />

        <Button
          onClick={handleSend}
          className="h-10 w-10 sm:w-20 rounded-full sm:rounded-xl bg-[#F3CFC6] hover:bg-[#C4C4C4] text-black dark:text-white flex items-center justify-center"
          disabled={sending}
        >
          {sending ? (
            <span className="animate-pulse text-sm">...</span>
          ) : (
            <>
              <Send className="h-5 w-5 sm:hidden" />
              <span className="hidden sm:inline">Send</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default MessageInput;
