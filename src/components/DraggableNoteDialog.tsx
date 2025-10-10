import React, { useState, useEffect } from "react";
import { DndContext, useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { GripVertical } from "lucide-react";

interface Note {
  id: string;
  content: string;
  createdAt: string;
}

interface DraggableNoteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  targetId: string | null;
  targetType: "user" | "professional" | null;
  onNoteCreated: () => void;
  noteToEdit?: Note | null; // Added for editing
}

const DraggableNoteDialog: React.FC<DraggableNoteDialogProps> = ({
  isOpen,
  onClose,
  targetId,
  targetType,
  onNoteCreated,
  noteToEdit,
}) => {
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const isEditMode = !!noteToEdit;

  useEffect(() => {
    setContent(noteToEdit?.content || "");
  }, [noteToEdit]);

  const handleSave = async () => {
    if (!content || !targetId || !targetType) {
      toast.error("Please enter content");
      return;
    }
    setSaving(true);
    try {
      let res;
      if (isEditMode) {
        // Edit mode: PATCH
        res = await fetch(`/api/notes/${noteToEdit!.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });
      } else {
        // Create mode: POST
        const body =
          targetType === "user"
            ? { targetUserId: targetId, content }
            : { targetSpecialistId: targetId, content };
        res = await fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }

      if (!res.ok)
        throw new Error(`Failed to ${isEditMode ? "update" : "save"} note`);
      toast.success(`Note ${isEditMode ? "updated" : "saved"}`);
      setContent("");
      onNoteCreated();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error(`Failed to ${isEditMode ? "update" : "save"} note`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="p-0 border-0 bg-transparent shadow-none max-w-md">
        <DndContext>
          <DraggableContent
            onSave={handleSave}
            content={content}
            setContent={setContent}
            saving={saving}
            onClose={onClose}
            title={isEditMode ? "Edit Note" : "Create Note"}
          />
        </DndContext>
      </DialogContent>
    </Dialog>
  );
};

// Separate draggable component
const DraggableContent: React.FC<{
  onSave: () => void;
  content: string;
  setContent: (val: string) => void;
  saving: boolean;
  onClose: () => void;
  title: string;
}> = ({ onSave, content, setContent, saving, onClose, title }) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: "draggable-note",
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-80 touch-none"
    >
      <DialogHeader
        className="p-4 border-b flex flex-row items-center cursor-move"
        {...listeners}
        {...attributes}
      >
        <GripVertical className="h-5 w-5 mr-2 text-gray-500" />
        {/* Drag handle icon */}
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <div className="p-4">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your note..."
          className="min-h-[100px]"
        />
      </div>
      <DialogFooter className="p-4 border-t">
        <Button variant="outline" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={onSave} disabled={saving || !content}>
          Save
        </Button>
      </DialogFooter>
    </div>
  );
};

export default DraggableNoteDialog;
