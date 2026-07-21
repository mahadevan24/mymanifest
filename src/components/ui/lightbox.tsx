"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, X, Calendar, Image as ImageIcon, Maximize2, Minimize2 } from "lucide-react";
import { VisionImage } from "@/lib/db";

interface LightboxProps {
  isOpen: boolean;
  onClose: () => void;
  images: VisionImage[];
  currentIndex: number;
  setCurrentIndex: (index: number) => void;
}

export default function Lightbox({
  isOpen,
  onClose,
  images,
  currentIndex,
  setCurrentIndex,
}: LightboxProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Cinematic animation state — origin is where the user clicked
  const [animationOrigin, setAnimationOrigin] = useState({ x: 50, y: 50 });
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);

  // Reset animation when navigating images
  useEffect(() => {
    setIsAnimating(false);
    setAnimationOrigin({ x: 50, y: 50 });
  }, [currentIndex]);

  // Reset when lightbox closes
  useEffect(() => {
    if (!isOpen) {
      setIsAnimating(false);
      setAnimationOrigin({ x: 50, y: 50 });
    }
  }, [isOpen]);

  const handleNext = useCallback(() => {
    setCurrentIndex((currentIndex + 1) % images.length);
  }, [currentIndex, images, setCurrentIndex]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((currentIndex - 1 + images.length) % images.length);
  }, [currentIndex, images, setCurrentIndex]);

  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error("Failed to toggle fullscreen:", err);
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    if (!isOpen && document.fullscreenElement) {
      document.exitFullscreen().catch((err) => console.error("Error exiting fullscreen:", err));
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, handleNext, handlePrev, toggleFullscreen, onClose]);

  // Handle image click — set origin and start/restart cinematic animation
  const handleImageClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const container = imageContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setAnimationOrigin({ x, y });
    setIsAnimating(true);
    // Increment key to force React to remount the img, restarting the CSS animation
    setAnimationKey((prev) => prev + 1);
  }, []);

  if (!isOpen || images.length === 0 || currentIndex < 0 || currentIndex >= images.length) {
    return null;
  }

  const currentImage = images[currentIndex];

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === containerRef.current) {
      onClose();
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div
      ref={containerRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex flex-col items-center bg-black/95 backdrop-blur-md animate-in fade-in duration-200"
    >
      {/* Slim Top Bar */}
      <div className="w-full flex items-center justify-between py-2 px-4 z-10 bg-neutral-950/80 backdrop-blur-md border-b border-neutral-800/50 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <ImageIcon className="w-4 h-4 text-white shrink-0" />
          <span className="text-xs text-neutral-300 truncate max-w-xs font-semibold uppercase tracking-wider">
            {currentImage.name || "Untitled Image"}
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-neutral-500 font-bold tracking-widest uppercase">
            <Calendar className="w-3 h-3" />
            <span>{formatDate(currentImage.createdAt)}</span>
          </div>
          <span className="text-[10px] text-neutral-500 font-bold tracking-widest uppercase">
            {currentIndex + 1} / {images.length}
          </span>
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            aria-label={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            title={isFullscreen ? "Exit Fullscreen (F)" : "Enter Fullscreen (F)"}
          >
            {isFullscreen ? (
              <Minimize2 className="w-5 h-5" />
            ) : (
              <Maximize2 className="w-5 h-5" />
            )}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            aria-label="Close Lightbox"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Full-size Image Area */}
      <div className="flex-1 w-full flex items-center justify-center relative min-h-0">
        {/* Prev Arrow */}
        <button
          onClick={handlePrev}
          className="absolute left-2 sm:left-4 z-10 p-3 rounded-full bg-neutral-950/70 border border-neutral-800/50 text-neutral-300 hover:text-white hover:bg-neutral-800 hover:border-neutral-600 transition-all shadow-lg cursor-pointer"
          aria-label="Previous Image"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* Cinematic Image Container — overflow hidden clips the zoom/pan animation */}
        <div
          ref={imageContainerRef}
          onClick={handleImageClick}
          className="relative overflow-hidden rounded-md max-w-[calc(100vw-6rem)] max-h-[calc(100vh-3.5rem)] flex items-center justify-center cursor-pointer"
        >
          <img
            key={`${currentIndex}-${animationKey}`}
            src={currentImage.url}
            alt={currentImage.name || "Vision Board Image"}
            onDoubleClick={toggleFullscreen}
            title="Click to focus animation • Double-click for fullscreen"
            draggable={false}
            className={`max-w-[calc(100vw-6rem)] max-h-[calc(100vh-3.5rem)] object-contain select-none ${
              isAnimating ? "animate-cinematic-focus" : ""
            }`}
            style={{
              transformOrigin: `${animationOrigin.x}% ${animationOrigin.y}%`,
            }}
          />
        </div>

        {/* Next Arrow */}
        <button
          onClick={handleNext}
          className="absolute right-2 sm:right-4 z-10 p-3 rounded-full bg-neutral-950/70 border border-neutral-800/50 text-neutral-300 hover:text-white hover:bg-neutral-800 hover:border-neutral-600 transition-all shadow-lg cursor-pointer"
          aria-label="Next Image"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Click hint */}
      {!isAnimating && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-full bg-neutral-950/80 border border-neutral-800/50 backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-300">
          <span className="text-[10px] text-neutral-400 font-bold tracking-widest uppercase">
            CLICK ANYWHERE ON THE IMAGE TO FOCUS
          </span>
        </div>
      )}
    </div>
  );
}
