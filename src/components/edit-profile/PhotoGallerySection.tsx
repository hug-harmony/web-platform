/* eslint-disable @typescript-eslint/no-explicit-any */
// src/components/edit-profile/PhotoGallerySection.tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import Image from "next/image";
import { Plus, X, Upload, Loader2 } from "lucide-react";

interface Photo {
  id: string;
  url: string;
}

interface Props {
  userId: string;
  initialPhotos?: Photo[];
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
const MAX_PHOTOS = 10;

export function PhotoGallerySection({ userId, initialPhotos = [] }: Props) {
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  // Fetch photos on mount
  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        const res = await fetch(`/api/users/${userId}/photos`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setPhotos(data.photos || []);
        }
      } catch (error) {
        console.error("Failed to fetch photos:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (initialPhotos.length > 0) {
      setPhotos(initialPhotos);
      setIsLoading(false);
    } else {
      fetchPhotos();
    }
  }, [userId, initialPhotos]);

  const validateAndUpload = async (files: FileList) => {
    const validFiles: File[] = [];
    let totalNew = photos.length + files.length;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image`);
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} is larger than 5MB`);
        continue;
      }

      if (totalNew > MAX_PHOTOS) {
        toast.error("Maximum 10 photos allowed");
        break;
      }

      validFiles.push(file);
      totalNew--;
    }

    if (validFiles.length === 0) return;

    setIsUploading(true);
    const formData = new FormData();
    validFiles.forEach((file) => formData.append("photos", file));

    try {
      const res = await fetch(`/api/users/${userId}/photos`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }

      const { photos: uploaded } = await res.json();
      setPhotos((prev) => [...prev, ...uploaded]);
      toast.success(`Uploaded ${uploaded.length} photo(s)`);
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const deletePhoto = async (photoId: string) => {
    setDeletingIds((prev) => new Set(prev).add(photoId));

    try {
      const res = await fetch(`/api/users/${userId}/photos/${photoId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) throw new Error("Delete failed");

      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      toast.success("Photo removed");
    } catch {
      toast.error("Failed to delete photo");
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(photoId);
        return next;
      });
    }
  };

  const canAddMore = photos.length < MAX_PHOTOS;

  // Loading skeleton
  if (isLoading) {
    return (
      <Card className="border-[#F3CFC6]/50 bg-white dark:bg-gray-900">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-5 w-40" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-[#F3CFC6]/50 bg-white dark:bg-gray-900">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-black dark:text-white">
            Photo Gallery
          </h2>
          <span className="text-sm text-muted-foreground">
            {photos.length} / {MAX_PHOTOS} • Max 5MB per photo
          </span>
        </div>

        {photos.length === 0 ? (
          <label
            className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-[#F3CFC6] rounded-xl cursor-pointer hover:bg-[#F3CFC6]/5 transition-colors ${
              isUploading ? "pointer-events-none opacity-50" : ""
            }`}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-12 h-12 text-[#F3CFC6] mb-3 animate-spin" />
                <p className="text-lg font-medium text-black dark:text-white">
                  Uploading...
                </p>
              </>
            ) : (
              <>
                <Upload className="w-12 h-12 text-[#F3CFC6] mb-3" />
                <p className="text-lg font-medium text-black dark:text-white">
                  Add Photos
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Up to 10 photos • Max 5MB each
                </p>
              </>
            )}
            <input
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) =>
                e.target.files && validateAndUpload(e.target.files)
              }
              disabled={isUploading}
            />
          </label>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {photos.map((photo) => {
                const isDeleting = deletingIds.has(photo.id);
                return (
                  <div
                    key={photo.id}
                    className={`relative group aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-[#F3CFC6] transition ${
                      isDeleting ? "opacity-50" : ""
                    }`}
                  >
                    <Image
                      src={photo.url}
                      alt="Gallery"
                      fill
                      className="object-cover"
                    />
                    {isDeleting ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                      </div>
                    ) : (
                      <button
                        onClick={() => deletePhoto(photo.id)}
                        className="absolute top-2 right-2 bg-red-500/90 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}

              {canAddMore && (
                <label
                  className={`aspect-square border-2 border-dashed border-[#F3CFC6] rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-[#F3CFC6]/5 transition ${
                    isUploading ? "pointer-events-none opacity-50" : ""
                  }`}
                >
                  {isUploading ? (
                    <Loader2 className="w-8 h-8 text-[#F3CFC6] animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-8 h-8 text-[#F3CFC6]" />
                      <span className="text-xs mt-2 text-black dark:text-white">
                        Add More
                      </span>
                    </>
                  )}
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      e.target.files && validateAndUpload(e.target.files)
                    }
                    disabled={isUploading}
                  />
                </label>
              )}
            </div>

            {!canAddMore && (
              <div className="text-center pt-4">
                <p className="text-sm text-muted-foreground">
                  Gallery is full (10/10)
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
