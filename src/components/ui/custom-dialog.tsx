"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle, Info } from "lucide-react";

interface CustomDialogProps {
  isOpen: boolean;
  type: "alert" | "confirm";
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  variant?: "info" | "warning" | "danger";
}

export default function CustomDialog({
  isOpen,
  type,
  title,
  message,
  confirmLabel = "OK",
  cancelLabel = "CANCEL",
  onConfirm,
  onCancel,
  variant = "info",
}: CustomDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onCancel) {
        onCancel();
      }
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
      if (type === "confirm" && onCancel) {
        onCancel();
      } else if (type === "alert") {
        onConfirm();
      }
    }
  };

  const renderIcon = () => {
    switch (variant) {
      case "danger":
        return (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500">
            <AlertTriangle className="w-6 h-6" />
          </div>
        );
      case "warning":
        return (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
            <AlertTriangle className="w-6 h-6" />
          </div>
        );
      default:
        return (
          <div className="p-3 rounded-xl bg-neutral-500/10 border border-neutral-500/20 text-neutral-400">
            <Info className="w-6 h-6" />
          </div>
        );
    }
  };

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        ref={dialogRef}
        className="w-full max-w-sm rounded-2xl bg-zinc-950 border border-neutral-900 p-6 shadow-2xl relative animate-in fade-in slide-in-from-bottom-8 duration-300"
      >
        <div className="flex flex-col items-center text-center space-y-4">
          {renderIcon()}
          
          <div className="space-y-1">
            <h3 className="font-display font-bold text-base text-white tracking-wider uppercase">
              {title}
            </h3>
            <p className="text-xs text-neutral-400 font-semibold tracking-wide leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          {type === "confirm" && onCancel && (
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-lg border border-neutral-800 hover:border-neutral-600 hover:bg-neutral-900 text-neutral-400 hover:text-white font-bold tracking-wider text-xs transition-all duration-200 cursor-pointer uppercase"
            >
              {cancelLabel}
            </button>
          )}
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-lg font-bold tracking-wider text-xs transition-all duration-200 cursor-pointer uppercase ${
              variant === "danger"
                ? "bg-red-600 hover:bg-red-500 text-white"
                : variant === "warning"
                ? "bg-amber-500 hover:bg-amber-400 text-black"
                : "bg-white hover:bg-neutral-200 text-black"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
