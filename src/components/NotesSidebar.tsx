import React, { useState, useEffect, useCallback } from "react"; // Added useCallback
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash } from "lucide-react";
import { toast } from "sonner";
import DraggableNoteDialog from "@/components/DraggableNoteDialog";
import { Skeleton } from "./ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface Note {
  id: string;
  content: string;
  createdAt: string;
}

interface NotesSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  targetId: string | null;
  targetType: "user" | "professional" | null;
}

const NotesSidebar: React.FC<NotesSidebarProps> = ({
  isOpen,
  onClose,
  targetId,
  targetType,
}) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDraggableOpen, setIsDraggableOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null); // For edit
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/notes?targetType=${targetType}&targetId=${targetId}`
      );
      if (!res.ok) throw new Error("Failed to fetch notes");
      const data = await res.json();
      setNotes(data);
    } catch (error) {
      toast.error("Failed to load notes");
      console.error(error); // Used error
    } finally {
      setLoading(false);
    }
  }, [targetType, targetId]); // Dependencies for useCallback

  useEffect(() => {
    if (isOpen && targetId && targetType) {
      fetchNotes();
    }
  }, [isOpen, targetId, targetType, fetchNotes]); // Now fetchNotes is stable

  const handleNoteCreatedOrUpdated = () => {
    fetchNotes(); // Refetch after create or edit
  };

  const handleEdit = (note: Note) => {
    setSelectedNote(note);
    setIsDraggableOpen(true);
  };

  const handleDelete = (id: string) => {
    setNoteToDelete(id);
    setIsDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!noteToDelete) return;
    try {
      const res = await fetch(`/api/notes/${noteToDelete}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete note");
      toast.success("Note deleted");
      setIsDeleteOpen(false);
      fetchNotes();
    } catch (error) {
      toast.error("Failed to delete note");
      console.error(error); // Used error
    }
  };

  return (
    <>
      <Drawer open={isOpen} onOpenChange={onClose} direction="right">
        <DrawerContent className="w-80 h-full fixed right-0 top-0 bottom-0 bg-white dark:bg-gray-800">
          <DrawerHeader>
            <DrawerTitle>Notes for this user</DrawerTitle>
          </DrawerHeader>
          <div className="p-4 overflow-y-auto flex-1">
            {loading ? (
              <Skeleton className="h-32 w-full" />
            ) : notes.length > 0 ? (
              notes.map((note) => (
                <div
                  key={note.id}
                  className="p-2 border-b flex justify-between items-start"
                >
                  <div>
                    <p>{note.content}</p>
                    <small>{new Date(note.createdAt).toLocaleString()}</small>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(note)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(note.id)}
                      className="text-red-500"
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500">No notes yet</p>
            )}
          </div>
          <DrawerFooter>
            <Button
              onClick={() => {
                setSelectedNote(null);
                setIsDraggableOpen(true);
              }}
            >
              <Plus className="mr-2" /> Create Note
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <DraggableNoteDialog
        isOpen={isDraggableOpen}
        onClose={() => setIsDraggableOpen(false)}
        targetId={targetId}
        targetType={targetType}
        onNoteCreated={handleNoteCreatedOrUpdated}
        noteToEdit={selectedNote} // Pass selected note for edit mode
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this note? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default NotesSidebar;
