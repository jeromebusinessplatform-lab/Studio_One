import React from "react";
import { Loader2 } from "lucide-react";

interface AdminOverlayLoaderProps {
  isVisible: boolean;
  label?: string;
  sublabel?: string;
}

export function AdminOverlayLoader({
  isVisible,
  label = "Processing Request...",
  sublabel = "Updating Firestore database...",
}: AdminOverlayLoaderProps) {
  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-[2px] transition-all duration-200 animate-in fade-in"
      role="status"
      aria-live="polite"
    >
      <div className="bg-white/95 text-neutral-900 border border-neutral-200/90 rounded-2xl p-4 sm:p-5 shadow-2xl flex flex-col items-center justify-center gap-2.5 max-w-xs w-full mx-4 text-center">
        <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-900 border border-neutral-200/80">
          <Loader2 size={22} className="animate-spin stroke-[2.5]" />
        </div>
        <div className="space-y-0.5">
          <div
            className="text-sm font-bold tracking-tight uppercase text-neutral-950 font-condensed"
            style={{ fontFamily: "'Roboto Condensed', sans-serif" }}
          >
            {label}
          </div>
          {sublabel && (
            <p
              className="text-[11px] text-neutral-500 font-normal leading-tight font-sans"
              style={{ fontFamily: "'Ubuntu', sans-serif" }}
            >
              {sublabel}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
