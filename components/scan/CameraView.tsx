"use client";

import type { ReactNode, RefObject } from "react";
import { X } from "lucide-react";

/**
 * Shared full-screen camera viewfinder for the barcode scanner and the AI meal
 * photo. Rendered as a fixed overlay (above the bottom nav) so the live frame
 * always fills the viewport and every control stays in reach — no scrolling,
 * and the two flows look identical by construction. Purpose-specific bits
 * (scanline, hint field, footer controls) come in through slots.
 */
export function CameraView({
  videoRef,
  title,
  caption,
  onClose,
  scanning = false,
  hint,
  footer,
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  title: string;
  caption: string;
  onClose: () => void;
  scanning?: boolean;
  hint?: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="animate-fade fixed inset-0 z-[60] bg-black text-cream">
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Legibility scrims top and bottom. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-black/65 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-60 bg-gradient-to-t from-black/80 to-transparent" />

      {/* Top bar: close + editorial eyebrow title. */}
      <div
        className="absolute inset-x-0 top-0 flex items-center gap-3 px-5"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 14px)" }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close camera"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/45 backdrop-blur-md transition active:scale-90"
        >
          <X className="h-5 w-5" />
        </button>
        <span className="truncate rounded-full bg-black/45 px-3.5 py-1.5 text-[0.66rem] font-semibold uppercase tracking-[0.22em] text-cream backdrop-blur-md">
          {title}
        </span>
      </div>

      {/* Optional hint field (AI meal photo), tucked under the top bar. */}
      {hint && (
        <div
          className="absolute inset-x-0 px-5"
          style={{ top: "calc(env(safe-area-inset-top) + 62px)" }}
        >
          {hint}
        </div>
      )}

      {/* Framing guide — identical brackets for both flows. */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="relative aspect-square w-[66%] max-w-[290px]">
          <span className="absolute left-0 top-0 h-9 w-9 rounded-tl-2xl border-l-2 border-t-2 border-cream/85" />
          <span className="absolute right-0 top-0 h-9 w-9 rounded-tr-2xl border-r-2 border-t-2 border-cream/85" />
          <span className="absolute bottom-0 left-0 h-9 w-9 rounded-bl-2xl border-b-2 border-l-2 border-cream/85" />
          <span className="absolute bottom-0 right-0 h-9 w-9 rounded-br-2xl border-b-2 border-r-2 border-cream/85" />
          {scanning && (
            <span className="animate-scanline absolute inset-x-4 h-0.5 rounded-full bg-leaf shadow-[0_0_14px_2px_rgba(31,107,67,0.75)]" />
          )}
        </div>
      </div>

      {/* Caption on a frosted chip so it stays legible over any frame. */}
      <div
        className="absolute inset-x-0 flex justify-center px-6"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 120px)" }}
      >
        <p className="rounded-full bg-black/55 px-4 py-2 text-center text-sm font-medium text-cream backdrop-blur-md">
          {caption}
        </p>
      </div>

      {/* Footer control cluster. */}
      <div
        className="absolute inset-x-0 px-6"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 26px)" }}
      >
        {footer}
      </div>
    </div>
  );
}
