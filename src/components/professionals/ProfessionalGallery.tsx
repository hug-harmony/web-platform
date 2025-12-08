// src/components/professionals/ProfessionalGallery.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Camera, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Photo {
  id: string;
  url: string;
}

interface Props {
  photos: Photo[];
  name: string;
}

export function ProfessionalGallery({ photos, name }: Props) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (!photos || photos.length === 0) return null;

  const openLightbox = (index: number) => setSelectedIndex(index);
  const closeLightbox = () => setSelectedIndex(null);

  const goToPrevious = () => {
    if (selectedIndex !== null) {
      setSelectedIndex(
        selectedIndex === 0 ? photos.length - 1 : selectedIndex - 1
      );
    }
  };

  const goToNext = () => {
    if (selectedIndex !== null) {
      setSelectedIndex(
        selectedIndex === photos.length - 1 ? 0 : selectedIndex + 1
      );
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") goToPrevious();
    if (e.key === "ArrowRight") goToNext();
    if (e.key === "Escape") closeLightbox();
  };

  return (
    <>
      <Card className="shadow-lg border-[#F3CFC6]/30">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold text-black dark:text-white flex items-center gap-2">
              <Camera className="h-5 w-5 text-[#F3CFC6]" />
              Photo Gallery
            </CardTitle>
            <span className="text-sm text-muted-foreground">
              {photos.length} {photos.length === 1 ? "photo" : "photos"}
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Responsive grid: 3 columns on mobile, 4 on tablet, 5 on desktop */}
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
            {photos.map((photo, index) => (
              <div
                key={photo.id}
                onClick={() => openLightbox(index)}
                className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group border border-transparent hover:border-[#F3CFC6] transition-all duration-200"
              >
                <Image
                  src={photo.url}
                  alt={`${name}'s photo ${index + 1}`}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-110"
                  sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 20vw"
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Lightbox Dialog */}
      <Dialog open={selectedIndex !== null} onOpenChange={closeLightbox}>
        <DialogContent
          className="max-w-4xl w-full h-[90vh] p-0 bg-black/95 border-none"
          onKeyDown={handleKeyDown}
        >
          {selectedIndex !== null && (
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={closeLightbox}
                className="absolute top-4 right-4 z-50 text-white hover:bg-white/20 rounded-full"
              >
                <X className="h-6 w-6" />
              </Button>

              {/* Navigation arrows */}
              {photos.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={goToPrevious}
                    className="absolute left-4 z-50 text-white hover:bg-white/20 rounded-full h-12 w-12"
                  >
                    <ChevronLeft className="h-8 w-8" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={goToNext}
                    className="absolute right-4 z-50 text-white hover:bg-white/20 rounded-full h-12 w-12"
                  >
                    <ChevronRight className="h-8 w-8" />
                  </Button>
                </>
              )}

              {/* Main image */}
              <div className="relative w-full h-full max-h-[80vh] max-w-[90vw]">
                <Image
                  src={photos[selectedIndex].url}
                  alt={`${name}'s photo ${selectedIndex + 1}`}
                  fill
                  className="object-contain"
                  sizes="90vw"
                  priority
                />
              </div>

              {/* Photo counter */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-4 py-2 rounded-full">
                {selectedIndex + 1} / {photos.length}
              </div>

              {/* Thumbnail strip */}
              {photos.length > 1 && (
                <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-2 max-w-[90vw] overflow-x-auto p-2 bg-black/50 rounded-lg">
                  {photos.map((photo, index) => (
                    <button
                      key={photo.id}
                      onClick={() => setSelectedIndex(index)}
                      className={`relative w-12 h-12 sm:w-16 sm:h-16 rounded-md overflow-hidden flex-shrink-0 transition-all duration-200 ${
                        index === selectedIndex
                          ? "ring-2 ring-[#F3CFC6] opacity-100"
                          : "opacity-60 hover:opacity-100"
                      }`}
                    >
                      <Image
                        src={photo.url}
                        alt={`Thumbnail ${index + 1}`}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
