import Link from "next/link";
import { FolderHeart } from "lucide-react";
import { Category } from "@/lib/db";

interface CategoryCardProps {
  category: Category;
}

export default function CategoryCard({ category }: CategoryCardProps) {
  const hasCover = !!category.coverImageUrl;

  return (
    <Link
      href={`/category/${category.id}`}
      className="group relative block h-full min-h-48 w-full rounded-xl overflow-hidden border border-neutral-900 hover:border-white/20 hover:shadow-[0_0_30px_rgba(255,255,255,0.06)] transition-all duration-500 cursor-pointer"
    >
      {/* Background Image / Placeholder */}
      {hasCover ? (
        <img
          src={category.coverImageUrl}
          alt={`${category.name} vision board`}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          loading="lazy"
        />
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
