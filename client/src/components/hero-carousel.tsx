import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeroCarouselProps {
  images: string[];
  interval?: number;
  onSlideChange?: (index: number) => void;
  overlayClassName?: string;
}

export function HeroCarousel({ images, interval = 5000, onSlideChange, overlayClassName }: HeroCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    const index = emblaApi.selectedScrollSnap();
    setSelectedIndex(index);
    if (onSlideChange) {
      onSlideChange(index);
    }
  }, [emblaApi, onSlideChange]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  useEffect(() => {
    if (!emblaApi || isPaused) return;
    
    // Check for prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;
    
    const autoplay = setInterval(() => {
      emblaApi.scrollNext();
    }, interval);
    return () => clearInterval(autoplay);
  }, [emblaApi, interval, isPaused]);

  return (
    <div 
      className="relative w-full h-full overflow-hidden" 
      ref={emblaRef}
      role="region"
      aria-label="Hero images carousel"
      aria-roledescription="carousel"
    >
      <div className="flex h-full">
        {images.map((image, index) => (
          <div key={index} className="flex-[0_0_100%] min-w-0 relative">
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-700"
              style={{ backgroundImage: `url(${image})` }}
            />
            <div
              className={`absolute inset-0 ${
                overlayClassName || "bg-gradient-to-b from-black/60 via-black/50 to-black/60"
              }`}
            />
          </div>
        ))}
      </div>

      {/* Navigation buttons */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20 hover:text-white z-10"
        onClick={scrollPrev}
        aria-label="Previous slide"
        data-testid="button-carousel-prev"
      >
        <ChevronLeft className="h-6 w-6" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20 hover:text-white z-10"
        onClick={scrollNext}
        aria-label="Next slide"
        data-testid="button-carousel-next"
      >
        <ChevronRight className="h-6 w-6" />
      </Button>
      
      {/* Pause/Play control */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20 hover:text-white z-10"
        onClick={() => setIsPaused(!isPaused)}
        aria-label={isPaused ? "Resume autoplay" : "Pause autoplay"}
        aria-pressed={isPaused}
        data-testid="button-carousel-pause"
      >
        {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
      </Button>

      {/* Indicators */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1 z-10" role="group" aria-label="Carousel navigation">
        {images.map((_, index) => (
          <button
            key={index}
            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
            onClick={() => emblaApi?.scrollTo(index)}
            aria-label={`Go to slide ${index + 1}`}
            aria-current={index === selectedIndex ? "true" : "false"}
            data-testid={`button-carousel-indicator-${index}`}
          >
            <span
              className={`rounded-full transition-all ${
                index === selectedIndex
                  ? "bg-white w-8 h-2"
                  : "bg-white/50 hover:bg-white/75 w-2 h-2"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
