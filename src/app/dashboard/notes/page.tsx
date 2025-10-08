/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Notebook, Search, Filter, Pencil, Trash } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
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

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      fetchNotes();
    }
  }, [status, session]);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notes", {
        cache: "no-store",
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch notes: ${res.status}`);
      }
      const notesData = await res.json();
      setNotes(
        Array.isArray(notesData)
          ? notesData.map((note: any) => ({
              id: note.id || "",
              content: note.content || "",
              createdAt: note.createdAt || "",
              targetType: note.targetType || "user",
              targetName: note.targetName || "Unknown",
              targetId: note.targetId || "",
            }))
          : []
      );
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to fetch notes");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleTypeFilterChange = (value: string) => {
    setTypeFilter(value);
  };

  const filterNotes = (data: Note[]) =>
    data
      .filter((note) =>
        searchQuery
          ? note.targetName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            note.content.toLowerCase().includes(searchQuery.toLowerCase())
          : true
      )
      .filter((note) => (typeFilter ? note.targetType === typeFilter : true));

  const filteredNotes = filterNotes(notes);

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
      fetchNotes(); // Refetch to update list
    } catch (error) {
      console.error("Edit note error:", error);
      toast.error("Failed to update note");
    }
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
      fetchNotes(); // Refetch to update list
    } catch (error) {
      console.error("Delete note error:", error);
      toast.error("Failed to delete note");
    }
  };

  const handleDelete = (id: string) => {
    setNoteToDelete(id);
    setIsDeleteOpen(true);
  };

  if (status === "loading" || loading) {
    return (
      <motion.div
        className="space-y-6 w-full max-w-7xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
          <CardHeader>
            <Skeleton className="h-8 w-48 bg-[#C4C4C4]/50" />
            <Skeleton className="h-4 w-64 mt-2 bg-[#C4C4C4]/50" />
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            <Skeleton className="h-10 w-full sm:w-2/3 bg-[#C4C4C4]/50" />
            <Skeleton className="h-10 w-full sm:w-1/3 bg-[#C4C4C4]/50" />
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader>
            <Skeleton className="h-8 w-48 bg-[#C4C4C4]/50" />
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
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
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
        <CardHeader>
          <motion.div variants={itemVariants}>
            <CardTitle className="text-2xl font-bold text-black dark:text-white">
              Your Notes
            </CardTitle>
            <p className="text-sm opacity-80">View and manage your notes</p>
          </motion.div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center mb-6 w-full space-y-2 sm:space-y-0 sm:space-x-2">
            <div className="relative flex-grow w-full">
              <Search className="absolute left-3 top-1/2 h-6 w-6 -translate-y-1/2 text-[#fff]" />
              <Input
                type="text"
                placeholder="Search by target name or note content..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="p-2 pl-10 rounded border-[#F3CFC6] text-black dark:text-white focus:ring-[#F3CFC6]"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="flex items-center space-x-2 text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20 w-full sm:w-auto"
                >
                  <Filter className="h-6 w-6 text-[#F3CFC6]" />
                  <span>Type</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-white dark:bg-gray-800">
                <DropdownMenuLabel className="text-black dark:text-white">
                  Filter by Type
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleTypeFilterChange("")}
                  className="text-black dark:text-white hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20"
                >
                  All
                </DropdownMenuItem>
                {["user", "professional"].map((type) => (
                  <DropdownMenuItem
                    key={type}
                    onClick={() => handleTypeFilterChange(type)}
                    className="text-black dark:text-white hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20"
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-black dark:text-white">
            <Notebook className="mr-2 h-6 w-6 text-[#F3CFC6]" />
            All Notes ({filteredNotes.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <motion.div className="space-y-6" variants={containerVariants}>
            <ScrollArea className="h-[400px]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                  {filteredNotes.length > 0 ? (
                    filteredNotes.map((note) => (
                      <motion.div
                        key={note.id}
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        layout
                      >
                        <Card className="p-0 shadow-md hover:shadow-lg transition-shadow">
                          <CardContent className="p-4 space-y-2">
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
                                {new Date(note.createdAt).toLocaleDateString()}{" "}
                                at{" "}
                                {new Date(note.createdAt).toLocaleTimeString(
                                  [],
                                  { hour: "2-digit", minute: "2-digit" }
                                )}
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
                      No notes found.
                    </p>
                  )}
                </AnimatePresence>
              </div>
            </ScrollArea>
          </motion.div>
        </CardContent>
      </Card>

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
