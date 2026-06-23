"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Apple, Plus } from "lucide-react";
import { isIsoDate } from "@/lib/nutrition/date";

/**
 * Capture is one tap: the primary "+" goes straight to /scan — the single
 * surface that now handles every capture path (barcode auto-detect, photo→AI via
 * Capture/Library, text→AI via Describe, and manual barcode). No expanding menu
 * of capture choices. The non-capture destination (Foods) stays reachable as a
 * lighter companion button above the FAB. Both carry the viewed day (?date=) when
 * looking at a specific past day on the log so capture logs into the right date.
 */
export function AddSpeedDial() {
  const pathname = usePathname();
  const dateParam = useSearchParams().get("date");
  // Only inherit the day when viewing a specific past day on the log page.
  const logDate =
    pathname === "/log" && dateParam && isIsoDate(dateParam) ? dateParam : null;

  const withDate = (href: string) =>
    logDate ? `${href}${href.includes("?") ? "&" : "?"}date=${logDate}` : href;

  return (
    <div className="fixed bottom-24 right-5 z-50 flex flex-col items-end gap-3">
      {/* Foods — lighter companion so the food library stays one tap away. */}
      <Link
        href="/foods"
        aria-label="Browse foods"
        className="flex items-center gap-3"
      >
        <span className="rounded-full bg-ink/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.06em] text-paper shadow-sm">
          Food
        </span>
        <span className="flex h-12 w-12 items-center justify-center rounded-full border border-line bg-surface text-leaf shadow-[0_10px_24px_-12px_rgba(31,107,67,0.55)]">
          <Apple className="h-5 w-5" />
        </span>
      </Link>

      {/* Primary capture action — one tap straight to the unified /scan surface. */}
      <Link
        href={withDate("/scan")}
        aria-label="Capture food"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-leaf text-paper shadow-[0_16px_32px_-12px_rgba(31,107,67,0.65)] transition-transform duration-200 active:scale-95"
      >
        <Plus className="h-6 w-6" />
      </Link>
    </div>
  );
}
