"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { isIsoDate } from "@/lib/nutrition/date";

/**
 * Capture is one tap: the primary "+" goes straight to /scan — the single
 * surface that now handles every capture path (barcode auto-detect, photo→AI via
 * Capture/Library, text→AI via Describe, and manual barcode). No expanding menu
 * of capture choices. The food library is reached via the Log page's Log/Foods
 * toggle, so there's no longer a separate Foods companion here. The FAB carries
 * the viewed day (?date=) when looking at a specific past day on the log so
 * capture logs into the right date.
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
