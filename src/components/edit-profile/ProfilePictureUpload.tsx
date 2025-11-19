import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useRef } from "react";
import Image from "next/image";

interface Props {
  profileImage?: string | null;
  selectedFile: File | null;
  setSelectedFile: (file: File | null) => void;
  isEditing: boolean;
  updating: boolean;
  error?: string;
}

export function ProfilePictureUpload({
  profileImage,
  selectedFile,
  setSelectedFile,
  isEditing,
  updating,
  error,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-4">
      <Label className="text-black dark:text-white">Profile Picture</Label>

      {(selectedFile || profileImage) && (
        <div className="flex justify-center">
          <div className="relative group">
            <Image
              width={300}
              height={300}
              src={
                selectedFile ? URL.createObjectURL(selectedFile) : profileImage!
              }
              alt="Preview"
              className="h-32 w-32 rounded-full object-cover border-4 border-[#F3CFC6] shadow-lg"
            />
            {selectedFile && isEditing && (
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex justify-center">
        <Input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          ref={fileInputRef}
          className="hidden"
          disabled={!isEditing || updating}
          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
        />
        <Button
          type="button"
          variant="outline"
          disabled={!isEditing || updating}
          onClick={() => fileInputRef.current?.click()}
          className="text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#F3CFC6]/20 rounded-full px-8"
        >
          <Upload className="w-4 h-4 mr-2" />
          {selectedFile || profileImage ? "Change Photo" : "Upload Photo"}
        </Button>
      </div>

      {error && <p className="text-red-500 text-sm text-center">{error}</p>}
    </div>
  );
}
