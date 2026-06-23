"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ScanCamera } from "@/components/scan/ScanCamera";

/**
 * Unified scan surface — ONE live camera that auto-detects barcodes, plus a
 * Capture shutter and Library that route to the AI (label or meal), plus manual
 * barcode entry. The camera is the screen, so the legacy `?camera=1` deep-link
 * just lands here; `?date=` threads the day to log into. The whole flow lives in
 * <ScanCamera/>.
 */
function ScanInner() {
  const sp = useSearchParams();
  const eatenOn = sp.get("date") ?? undefined;
  return <ScanCamera eatenOn={eatenOn} />;
}

export default function ScanPage() {
  return (
    <Suspense fallback={null}>
      <ScanInner />
    </Suspense>
  );
}
