"use client";

import { useState } from "react";
import Link from "next/link";
import { NotebookPen, Plus, ScanBarcode, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

// Top-to-bottom display order (AI furthest from the +, Log nearest).
const ACTIONS = [
  { href: "/analyze", label: "AI", icon: Sparkles },
  { href: "/scan", label: "Scan", icon: ScanBarcode },
  { href: "/log", label: "Log", icon: NotebookPen },
];

export function AddSpeedDial() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* dim/close backdrop */}
      <button
        type="button"
        aria-hidden={!open}
        tabIndex={-1}
        onClick={() => setOpen(false)}
        className={cn(
          "fixed inset-0 z-40 bg-ink/15 backdrop-blur-[1px] transition-opacity duration-200",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      <div className="fixed bottom-24 right-5 z-50 flex flex-col items-end gap-3">
        {ACTIONS.map(({ href, label, icon: Icon }, i) => {
          // Nearest item (Log, last in array) animates first.
          const delay = open ? (ACTIONS.length - 1 - i) * 45 : 0;
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              tabIndex={open ? 0 : -1}
              className={cn(
                "flex items-center gap-3 transition-all duration-200 ease-out",
                open
                  ? "translate-y-0 scale-100 opacity-100"
                  : "pointer-events-none translate-y-3 scale-90 opacity-0",
              )}
              style={{ transitionDelay: `${delay}ms` }}
            >
              <span className="rounded-full bg-ink/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.06em] text-paper shadow-sm">
                {label}
              </span>
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-line bg-surface text-leaf shadow-[0_10px_24px_-12px_rgba(31,107,67,0.55)]">
                <Icon className="h-5 w-5" />
              </span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close add menu" : "Add to today"}
          aria-expanded={open}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-leaf text-paper shadow-[0_16px_32px_-12px_rgba(31,107,67,0.65)] transition-transform duration-200 active:scale-95"
        >
          <Plus
            className={cn("h-6 w-6 transition-transform duration-200", open && "rotate-45")}
          />
        </button>
      </div>
    </>
  );
}
