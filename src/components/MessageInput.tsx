import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { ImageIcon, Plus } from "lucide-react";

interface MessageInputProps {
  input: string;
  setInput: (value: string) => void;
  imagePreview: string | null;
  setImagePreview: (value: string | null) => void;
  handleSend: () => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  sending: boolean;
  isSpecialist: boolean;
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
  isSpecialist,
  setIsProposalDialogOpen,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="p-4 border-t flex flex-col space-y-2 bg-gradient-to-t from-[#F3CFC6]/10 to-transparent">
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
        {isSpecialist && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsProposalDialogOpen(true)}
            className="h-10 w-10 text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#F3CFC6]/20"
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
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
          {sending ? <span className="animate-pulse">Sending...</span> : "Send"}
        </Button>
      </div>
    </div>
  );
};

export default MessageInput;
