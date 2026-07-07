"use client";

import { CheckCircle2, Loader2, Image as ImageIcon } from "lucide-react";

interface UploadProgressProps {
  isOpen: boolean;
  progress: number;
  filesCount: number;
  completedCount: number;
  isDone: boolean;
  onClose: () => void;
}

export default function UploadModal({
  isOpen,
  progress,
  filesCount,
  completedCount,
  isDone,
  onClose,
}: UploadProgressProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-sm rounded-xl p-6 text-center shadow-2xl border border-neutral-800 bg-neutral-950 relative animate-in zoom-in-95 duration-200">
        
        {/* Progress Spinner or Success Check - Monochrome */}
        <div className="flex justify-center mb-6">
          {isDone ? (
            <div className="w-16 h-16 rounded-full bg-white border border-white flex items-center justify-center text-black animate-bounce">
              <CheckCircle2 className="w-8 h-8 text-black" />
            </div>
          ) : (
            <div className="relative w-16 h-16 flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-white animate-spin" />
              <span className="absolute text-xs font-semibold text-white">
                {progress}%
              </span>
            </div>
          )}
        </div>

        {/* Title */}
        <h4 className="font-display font-semibold text-lg text-white uppercase tracking-wider mb-2">
          {isDone ? "Upload Complete" : "Uploading Images"}
        </h4>
        
        {/* Detail text */}
        <p className="text-xs text-neutral-400 mb-6">
          {isDone 
            ? `Added ${filesCount} image${filesCount > 1 ? "s" : ""} to your board.`
            : `Processing file ${completedCount + 1} of ${filesCount}...`
          }
        </p>

        {/* Progress bar */}
        <div className="w-full bg-neutral-900 border border-neutral-800 rounded-full h-2 mb-6 overflow-hidden">
          <div 
            className="bg-white h-full transition-all duration-300 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Queue List Preview container */}
        <div className="max-h-24 overflow-y-auto mb-6 text-left border border-neutral-900 rounded-lg p-3 bg-neutral-900/50 space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Upload Queue</span>
          </div>
          <div className="text-xs text-neutral-300">
            {completedCount} of {filesCount} files completed
          </div>
        </div>

        {/* Action Button */}
        {isDone && (
          <button
            onClick={onClose}
            className="w-full py-2.5 font-bold rounded-lg bg-white text-black hover:bg-neutral-200 transition-colors uppercase tracking-wider text-xs cursor-pointer"
          >
            Done
          </button>
        )}
      </div>
    </div>
  );
}
