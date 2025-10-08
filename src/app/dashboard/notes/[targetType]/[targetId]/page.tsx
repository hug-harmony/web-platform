/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, Trash, Plus, Notebook } from "lucide-react";
import { useSession } from "next-auth/react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface Note {
  id: string;
  content: string;
  createdAt: string;
  targetType: "user" | "professional";
  targetName: string;
  targetId: string;
}

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, staggerChildren: 0.2 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function NoteDetailPage() {
  const params = useParams();
  const targetType = params.targetType as "user" | "professional";
  const targetId = params.targetId as string;
  const [notes, setNotes] = useState<Note[]>([]);
  const [targetName, setTargetName] = useState("Unknown");
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      fetchNotes();
    }
  }, [status, targetType, targetId]);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/notes?targetType=${targetType}&targetId=${targetId}`,
        {
          cache: "no-store",
          credentials: "include",
        }
      );
      if (!res.ok) {
        throw new Error(`Failed to fetch notes: ${res.status}`);
      }
      const notesData = await res.json();
      setNotes(Array.isArray(notesData) ? notesData : []);
      if (notesData.length > 0) {
        setTargetName(notesData[0].targetName);
      }
    } catch (error) {
      console.error("Error fetching notes:", error);
      toast.error("Failed to fetch notes");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newContent) return;
    try {
      const body =
        targetType === "user"
          ? { targetUserId: targetId, content: newContent }
          : { targetSpecialistId: targetId, content: newContent };

      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to add note");
      toast.success("Note added successfully");
      setIsAddOpen(false);
      setNewContent("");
      fetchNotes();
    } catch (error) {
      console.error("Add note error:", error);
      toast.error("Failed to add note");
    }
  };

  const handleEdit = (note: Note) => {
    setSelectedNote(note);
    setEditedContent(note.content);
    setIsEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedNote || !editedContent) return;
    try {
      const res = await fetch(`/api/notes/${selectedNote.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editedContent }),
      });
      if (!res.ok) throw new Error("Failed to update note");
      toast.success("Note updated successfully");
      setIsEditOpen(false);
      fetchNotes();
    } catch (error) {
      console.error("Edit note error:", error);
      toast.error("Failed to update note");
    }
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
      toast.success("Note deleted successfully");
      setIsDeleteOpen(false);
      fetchNotes();
    } catch (error) {
      console.error("Delete note error:", error);
      toast.error("Failed to delete note");
    }
  };

  if (status === "loading" || loading) {
    return (
      <motion.div
        className="space-y-6 w-full max-w-7xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <Card className="shadow-lg">
          <CardHeader>
            <Skeleton className="h-8 w-48 bg-[#C4C4C4]/50" />
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <Skeleton className="h-10 w-32 bg-[#C4C4C4]/50" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, idx) => (
                <Skeleton
                  key={idx}
                  className="h-24 w-full bg-[#C4C4C4]/50 rounded-lg"
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  return (
    <motion.div
      className="space-y-6 w-full max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center text-black dark:text-white">
            <Notebook className="mr-2 h-6 w-6 text-[#F3CFC6]" />
            Notes for {targetName} ({notes.length})
          </CardTitle>
          <Button
            onClick={() => setIsAddOpen(true)}
            className="bg-[#F3CFC6] hover:bg-[#C4C4C4] text-black dark:text-white"
          >
            <Plus className="mr-2 h-4 w-4" /> Add New
          </Button>
        </CardHeader>
        <CardContent className="pt-6">
          <motion.div className="space-y-6" variants={containerVariants}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {notes.length > 0 ? (
                  notes.map((note) => (
                    <motion.div
                      key={note.id}
                      variants={cardVariants}
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                      layout
                    >
                      <Card className="shadow-md hover:shadow-lg transition-shadow">
                        <CardContent className="p-4 space-y-4">
                          <p className="text-sm text-[#C4C4C4]">
                            {note.content}
                          </p>
                          <div className="space-y-2">
                            <p className="text-sm text-[#C4C4C4]">
                              On{" "}
                              <Link
                                href={`/${note.targetType}/${note.targetId}`}
                                className="text-[#F3CFC6] hover:underline"
                              >
                                {note.targetName}
                              </Link>{" "}
                              <Badge
                                variant="outline"
                                className="ml-2 text-xs text-[#F3CFC6] border-[#F3CFC6]"
                              >
                                {note.targetType.charAt(0).toUpperCase() +
                                  note.targetType.slice(1)}
                              </Badge>
                            </p>
                            <p className="text-sm text-[#C4C4C4]">
                              {new Date(note.createdAt).toLocaleDateString()} at{" "}
                              {new Date(note.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(note)}
                              className="text-[#F3CFC6] hover:bg-[#F3CFC6]/20"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(note.id)}
                              className="text-red-500 hover:bg-red-500/20"
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))
                ) : (
                  <p className="text-center text-[#C4C4C4] col-span-full">
                    No notes for this profile yet. Add one using the button
                    above.
                  </p>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Label htmlFor="newContent">Note Content</Label>
            <Textarea
              id="newContent"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Write your new note here..."
            />
          </div>
          <DialogFooter>
            <Button onClick={handleAdd} disabled={!newContent}>
              Add Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Label htmlFor="editedContent">Note Content</Label>
            <Textarea
              id="editedContent"
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              placeholder="Edit your note here..."
            />
          </div>
          <DialogFooter>
            <Button onClick={handleSaveEdit} disabled={!editedContent}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
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
    </motion.div>
  );
}
