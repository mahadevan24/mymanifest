"use client";

import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, X, Calendar, Image as ImageIcon } from "lucide-react";
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
    };

    window.addEventListener("keydown", handleKeyDown);
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, currentIndex, images]);

  if (!isOpen || images.length === 0 || currentIndex < 0 || currentIndex >= images.length) {
    return null;
  }

  const currentImage = images[currentIndex];

  const handleNext = () => {
    setCurrentIndex((currentIndex + 1) % images.length);
  };

  const handlePrev = () => {
    setCurrentIndex((currentIndex - 1 + images.length) % images.length);
  };

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
      className="fixed inset-0 z-50 flex flex-col items-center justify-between p-4 bg-black/95 backdrop-blur-md animate-in fade-in duration-200"
    >
      {/* Top Bar */}
      <div className="w-full flex items-center justify-between py-2.5 px-4 border-b border-neutral-900 z-10 bg-neutral-950/60 backdrop-blur-md rounded-lg max-w-7xl">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-white" />
          <span className="text-xs text-neutral-300 truncate max-w-xs font-semibold uppercase tracking-wider">
            {currentImage.name || "Untitled Image"}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] text-neutral-500 font-bold tracking-widest uppercase">
            {currentIndex + 1} of {images.length}
          </span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
            aria-label="Close Lightbox"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Area: Image and Arrows */}
      <div className="flex-grow w-full max-w-7xl flex items-center justify-between relative my-4">
        {/* Prev Arrow */}
        <button
          onClick={handlePrev}
          className="absolute left-2 sm:left-4 z-10 p-3 rounded-full bg-neutral-950/80 border border-neutral-900 text-neutral-300 hover:text-white hover:bg-neutral-900 hover:border-neutral-700 transition-all shadow-lg cursor-pointer"
          aria-label="Previous Image"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* Center Image Container */}
        <div className="w-full h-full flex items-center justify-center p-2 sm:p-6">
          <img
            src={currentImage.url}
            alt={currentImage.name || "Vision Board Image"}
            className="max-w-full max-h-[70vh] sm:max-h-[75vh] object-contain rounded-lg shadow-2xl border border-neutral-900 animate-in zoom-in-95 duration-300 select-none pointer-events-none"
          />
        </div>

        {/* Next Arrow */}
        <button
          onClick={handleNext}
          className="absolute right-2 sm:right-4 z-10 p-3 rounded-full bg-neutral-950/80 border border-neutral-900 text-neutral-300 hover:text-white hover:bg-neutral-900 hover:border-neutral-700 transition-all shadow-lg cursor-pointer"
          aria-label="Next Image"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Bottom Bar Details */}
      <div className="w-full py-4 px-6 bg-neutral-950/40 border border-neutral-900 backdrop-blur-md rounded-lg max-w-md text-center mb-2">
        <div className="flex items-center justify-center gap-2 text-[10px] text-neutral-500 font-bold tracking-widest uppercase">
          <Calendar className="w-3.5 h-3.5" />
          <span>Manifested: {formatDate(currentImage.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}
