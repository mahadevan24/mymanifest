"use client";

import Link from "next/link";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-900 bg-black/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo - Monochrome */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <span className="font-display font-bold text-xl tracking-wider text-white">
            MYMANIFEST
          </span>
        </Link>
      </div>
    </header>
  );
}
