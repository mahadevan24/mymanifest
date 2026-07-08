"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { FolderHeart } from "lucide-react";
import { Category, getDB, VisionImage } from "@/lib/db";

interface CategoryCardProps {
  category: Category;
}

export default function CategoryCard({ category }: CategoryCardProps) {
  const [images, setImages] = useState<VisionImage[]>([]);
  const [urlA, setUrlA] = useState<string>("");
  const [urlB, setUrlB] = useState<string>("");
  const [activeLayer, setActiveLayer] = useState<"A" | "B">("A");

  // Use refs to hold mutable values so the interval callback always
  // reads the latest state without needing to restart the interval.
  const activeLayerRef = useRef(activeLayer);
  const urlARef = useRef(urlA);
  const urlBRef = useRef(urlB);
  const imagesRef = useRef(images);

  activeLayerRef.current = activeLayer;
  urlARef.current = urlA;
  urlBRef.current = urlB;
  imagesRef.current = images;

  useEffect(() => {
    let cancelled = false;
    async function loadCategoryImages() {
      try {
        const db = await getDB();
        const list = await db.getImages(category.id);
        if (!cancelled) {
          setImages(list);
          if (list.length > 0) {
            const initialUrl = category.coverImageUrl || list[0].url;
            setUrlA(initialUrl);
            setUrlB(initialUrl);
          } else if (category.coverImageUrl) {
            setUrlA(category.coverImageUrl);
            setUrlB(category.coverImageUrl);
          }
        }
      } catch {
        if (category.coverImageUrl) {
          setUrlA(category.coverImageUrl);
          setUrlB(category.coverImageUrl);
        }
      }
    }
    loadCategoryImages();
    return () => {
      cancelled = true;
    };
  }, [category.id, category.coverImageUrl]);

  const isEffect = !category.type || category.type === "effect";
  const animIndex = category.id
    ? (category.id.charCodeAt(category.id.length - 1) || 0) % 3
    : 0;
  const animationClass = isEffect
    ? ["animate-cinematic-1", "animate-cinematic-2", "animate-cinematic-3"][animIndex]
    : "";

  const rotateImage = useCallback(() => {
    const currentImages = imagesRef.current;
    const currentLayer = activeLayerRef.current;
    const currentUrl = currentLayer === "A" ? urlARef.current : urlBRef.current;

    const otherImages = currentImages.filter((img) => img.url !== currentUrl);
    if (otherImages.length === 0) return;

    const randomImg = otherImages[Math.floor(Math.random() * otherImages.length)];

    if (currentLayer === "A") {
      setUrlB(randomImg.url);
      setActiveLayer("B");
    } else {
      setUrlA(randomImg.url);
      setActiveLayer("A");
    }
  }, []);

  useEffect(() => {
    // Only rotate if it's an effect category card.
    // The image count check happens inside rotateImage via the ref.
    if (!isEffect) return;

    const timer = setInterval(rotateImage, 5000);
    return () => clearInterval(timer);
  }, [isEffect, rotateImage]);

  const hasCover = !!urlA || !!urlB;

  return (
    <Link
      href={`/category/${category.id}`}
      className="group relative block h-full min-h-48 w-full rounded-xl overflow-hidden border border-neutral-900 hover:border-white/20 hover:shadow-[0_0_30px_rgba(255,255,255,0.06)] transition-all duration-500 cursor-pointer"
    >
      {/* Background Image / Placeholder */}
      {hasCover ? (
        <div className="absolute inset-0 w-full h-full overflow-hidden transition-transform duration-1000 ease-out group-hover:scale-105">
          {urlA && (
            <img
              src={urlA}
              alt={`${category.name} vision board layer A`}
              style={{ opacity: activeLayer === "A" ? 1 : 0 }}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${animationClass}`}
              loading="lazy"
            />
          )}
          {urlB && (
            <img
              src={urlB}
              alt={`${category.name} vision board layer B`}
              style={{ opacity: activeLayer === "B" ? 1 : 0 }}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${animationClass}`}
              loading="lazy"
            />
          )}
        </div>
      ) : (
        <div className="absolute inset-0 bg-neutral-950 flex flex-col items-center justify-center gap-2 text-neutral-700 group-hover:text-neutral-500 transition-colors duration-500">
          <FolderHeart className="w-10 h-10 stroke-[1.25]" />
          <span className="text-[10px] font-bold tracking-widest uppercase">Empty Manifest Board</span>
        </div>
      )}

      {/* Bottom gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

      {/* Hover glow border */}
      <div className="absolute inset-0 border border-white/0 group-hover:border-white/10 transition-colors duration-500 rounded-xl pointer-events-none" />

      {/* Board Title — pinned to bottom-left */}
      <div className="absolute bottom-0 left-0 right-0 p-4 z-10 flex items-end justify-between">
        <h3 className="font-display font-extrabold text-xl sm:text-2xl tracking-[0.2em] text-white uppercase leading-none">
          {category.name}
        </h3>

        {/* Enter board pill — appears on hover */}
        <span className="px-2.5 py-1 text-[9px] font-bold tracking-widest text-white bg-white/10 border border-white/20 rounded-md opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
          OPEN
        </span>
      </div>
    </Link>
  );
}
