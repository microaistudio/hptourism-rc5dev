import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { buildObjectViewUrl } from "@/lib/utils";

interface ImageGalleryProps {
  images: Array<{
    filePath: string;
    fileName: string;
    mimeType?: string | null;
  }>;
  open: boolean;
  onClose: () => void;
  initialIndex?: number;
}

export function ImageGallery({ images, open, onClose, initialIndex = 0 }: ImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  
  // Reset currentIndex when gallery opens with new initialIndex or images change
  useEffect(() => {
    if (open && images.length > 0) {
      const validIndex = Math.max(0, Math.min(initialIndex, images.length - 1));
      setCurrentIndex(validIndex);
    }
  }, [open, initialIndex, images.length]);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const getImageUrl = (filePath: string, mimeType?: string | null, fileName?: string) => {
    return buildObjectViewUrl(filePath, {
      mimeType: mimeType ?? undefined,
      fileName,
    });
  };

  if (images.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl h-[90vh] p-0 bg-black/95 border-none">
        <div className="relative w-full h-full flex flex-col">
          {/* Close button */}
          <Button
            data-testid="button-close-gallery"
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-50 text-white hover:bg-white/20"
            onClick={onClose}
          >
            <X className="h-6 w-6" />
          </Button>

          {/* Image counter */}
          <div className="absolute top-4 left-4 z-50 bg-black/60 text-white px-3 py-1 rounded-md text-sm">
            {currentIndex + 1} / {images.length}
          </div>

          {/* Main image area */}
          <div className="flex-1 flex items-center justify-center relative px-16 py-4">
            {/* Previous button */}
            {images.length > 1 && (
              <Button
                data-testid="button-previous-image"
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-12 w-12"
                onClick={goToPrevious}
              >
                <ChevronLeft className="h-8 w-8" />
              </Button>
            )}

            {/* Current image */}
            <img
              src={getImageUrl(
                images[currentIndex].filePath,
                images[currentIndex].mimeType,
                images[currentIndex].fileName
              )}
              alt={images[currentIndex].fileName}
              className="max-h-full max-w-full object-contain"
              data-testid={`image-current-${currentIndex}`}
            />

            {/* Next button */}
            {images.length > 1 && (
              <Button
                data-testid="button-next-image"
                variant="ghost"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-12 w-12"
                onClick={goToNext}
              >
                <ChevronRight className="h-8 w-8" />
              </Button>
            )}
          </div>

          {/* Thumbnail strip */}
          {images.length > 1 && (
            <div className="border-t border-white/20 bg-black/60 p-4">
              <div className="flex gap-2 overflow-x-auto justify-center">
                {images.map((image, index) => (
                  <button
                    key={index}
                    data-testid={`thumbnail-${index}`}
                    onClick={() => setCurrentIndex(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded-md overflow-hidden border-2 transition-all ${
                      index === currentIndex
                        ? "border-primary scale-110"
                        : "border-white/20 hover:border-white/60"
                    }`}
                  >
                    <img
                      src={getImageUrl(image.filePath, image.mimeType, image.fileName)}
                      alt={image.fileName}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
