"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Trash2, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

interface Photo {
  id: string;
  url: string;
  uploadedAt: string;
  createdAt: string;
}

interface UserPhotoGalleryProps {
  userId: string;
}

export default function UserPhotoGallery({ userId }: UserPhotoGalleryProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchPhotos = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/users/${userId}/photos`);

      if (!response.ok) {
        throw new Error("Failed to fetch photos");
      }

      const data = await response.json();
      setPhotos(data.data);
    } catch (error) {
      console.error("Error fetching photos:", error);
      toast.error("Failed to load photos");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Fetch photos on mount
  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  const handleDeletePhoto = async (photoId: string) => {
    try {
      setIsDeleting(true);

      const response = await fetch(
        `/api/admin/users/${userId}/photos?photoId=${photoId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete photo");
      }

      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      setDeleteConfirmOpen(false);
      setPhotoToDelete(null);
      toast.success("Photo deleted successfully");
    } catch (error) {
      console.error("Error deleting photo:", error);
      toast.error("Failed to delete photo");
    } finally {
      setIsDeleting(false);
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1 },
  };

  return (
    <Card>
      <CardHeader className="bg-[#F3CFC6]/10 dark:bg-[#C4C4C4]/10">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-black dark:text-white">
            <ImageIcon className="h-5 w-5 text-[#F3CFC6]" />
            User Photo Gallery
          </CardTitle>
          <span className="text-sm text-[#C4C4C4]">
            {photos.length} photo{photos.length !== 1 ? "s" : ""}
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="aspect-square bg-gray-200 dark:bg-gray-700 animate-pulse rounded"
              />
            ))}
          </div>
        ) : photos.length === 0 ? (
          <div className="text-center py-12">
            <ImageIcon className="h-12 w-12 text-[#C4C4C4] mx-auto mb-4 opacity-50" />
            <p className="text-[#C4C4C4]">No photos uploaded yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <AnimatePresence>
              {photos.map((photo) => (
                <motion.div
                  key={photo.id}
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="relative group"
                >
                  {/* Photo Container */}
                  <div
                    className="aspect-square bg-gray-100 dark:bg-gray-800 rounded border border-[#C4C4C4] overflow-hidden cursor-pointer hover:border-[#F3CFC6] transition-colors"
                    onClick={() => setSelectedPhoto(photo)}
                  >
                    <Image
                      width={500}
                      height={500}
                      src={photo.url}
                      alt={`Photo from ${photo.uploadedAt}`}
                      className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                    />

                    {/* Overlay on Hover */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-between p-2">
                      <span className="text-xs text-white font-semibold bg-black/50 px-2 py-1 rounded">
                        View
                      </span>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-8 w-8 p-0 bg-red-600 hover:bg-red-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPhotoToDelete(photo.id);
                          setDeleteConfirmOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Photo Info */}
                  <p className="text-xs text-[#C4C4C4] mt-2 truncate">
                    {photo.uploadedAt}
                  </p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </CardContent>

      {/* Full Size Photo Modal */}
      <Dialog
        open={!!selectedPhoto}
        onOpenChange={() => setSelectedPhoto(null)}
      >
        <DialogContent className="bg-white dark:bg-gray-900 border border-[#C4C4C4] sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="text-black dark:text-white">
              Photo View
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-[#C4C4C4]">
              Uploaded on {selectedPhoto?.uploadedAt}
            </DialogDescription>
          </DialogHeader>

          {selectedPhoto && (
            <div className="relative w-full bg-gray-100 dark:bg-gray-800 rounded">
              <Image
                width={800}
                height={800}
                src={selectedPhoto.url}
                alt={`Full size photo from ${selectedPhoto.uploadedAt}`}
                className="w-full h-auto rounded"
              />
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedPhoto(null)}
              className="border-[#C4C4C4] text-black dark:text-white"
            >
              Close
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedPhoto) {
                  setPhotoToDelete(selectedPhoto.id);
                  setDeleteConfirmOpen(true);
                  setSelectedPhoto(null);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="bg-white dark:bg-gray-900 border border-red-300 dark:border-red-500 sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-red-600 dark:text-red-500">
              Delete Photo?
            </DialogTitle>
            <DialogDescription className="text-gray-700 dark:text-[#C4C4C4]">
              This action cannot be undone. The photo will be permanently
              deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteConfirmOpen(false);
                setPhotoToDelete(null);
              }}
              className="border-gray-300 dark:border-[#C4C4C4] text-black dark:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (photoToDelete) {
                  handleDeletePhoto(photoToDelete);
                }
              }}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
