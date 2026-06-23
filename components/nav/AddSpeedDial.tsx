"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Apple, Plus, ScanBarcode, Sparkles } from "lucide-react";
import { isIsoDate } from "@/lib/nutrition/date";
import { cn } from "@/lib/utils";

// Top-to-bottom display order (AI furthest from the +, Food nearest).
// `dated` actions carry the viewed day so capture logs into the right date.
// "Scan" now opens the unified camera (barcode + Capture + Library + Enter
// code). Photo capture moved there, so "AI" lands on the text/Describe flow.
const ACTIONS = [
  { href: "/analyze?tab=text", label: "AI", icon: Sparkles, dated: true },
  { href: "/scan", label: "Scan", icon: ScanBarcode, dated: true },
  { href: "/foods", label: "Food", icon: Apple, dated: false },
];

export function AddSpeedDial() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const dateParam = useSearchParams().get("date");
  // Only inherit the day when viewing a specific past day on the log page.
  const logDate =
    pathname === "/log" && dateParam && isIsoDate(dateParam) ? dateParam : null;

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

      {/* Container is click-through so its transparent gaps never swallow taps
          on content behind it (e.g. a log card's trash button). Only the FAB
          and the open action links opt back into pointer events. */}
      <div className="pointer-events-none fixed bottom-24 right-5 z-50 flex flex-col items-end gap-3">
        {ACTIONS.map(({ href, label, icon: Icon, dated }, i) => {
          // Nearest item (Log, last in array) animates first.
          const delay = open ? (ACTIONS.length - 1 - i) * 45 : 0;
          const target =
            dated && logDate
              ? `${href}${href.includes("?") ? "&" : "?"}date=${logDate}`
              : href;
          return (
            <Link
              key={href}
              href={target}
              onClick={() => setOpen(false)}
              tabIndex={open ? 0 : -1}
              className={cn(
                "flex items-center gap-3 transition-all duration-200 ease-out",
                open
                  ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
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
          className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-leaf text-paper shadow-[0_16px_32px_-12px_rgba(31,107,67,0.65)] transition-transform duration-200 active:scale-95"
        >
          <Plus
            className={cn("h-6 w-6 transition-transform duration-200", open && "rotate-45")}
          />
        </button>
      </div>
    </>
  );
}
