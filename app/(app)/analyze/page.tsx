"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Sparkles, PencilLine } from "lucide-react";
import { MealPhoto } from "@/components/scan/MealPhoto";
import { MealText } from "@/components/scan/MealText";
import { cn } from "@/lib/utils";

type Tab = "photo" | "text";

function AnalyzeInner() {
  const sp = useSearchParams();
  const initial = sp.get("tab");
  // `tab=label` is kept for backward-compat — the label flow now lives inside
  // the unified Photo tab, so it maps there.
  const [tab, setTab] = useState<Tab>(initial === "text" ? "text" : "photo");
  const barcode = sp.get("barcode") ?? undefined;
  const autoCamera = sp.get("camera") === "1";

  const tabClass = (active: boolean) =>
    cn(
      "flex items-center justify-center gap-1.5 rounded-full py-2 text-sm font-medium transition-colors",
      active ? "bg-leaf text-paper" : "text-muted hover:text-ink",
    );

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">AI capture</p>
        <h1 className="text-[2.2rem] leading-none">Analyze</h1>
      </header>

      <div className="grid grid-cols-2 gap-1 rounded-full border border-line bg-surface/40 p-1">
        <button type="button" onClick={() => setTab("photo")} className={tabClass(tab === "photo")}>
          <Sparkles className="h-4 w-4" /> Photo
        </button>
        <button type="button" onClick={() => setTab("text")} className={tabClass(tab === "text")}>
          <PencilLine className="h-4 w-4" /> Describe
        </button>
      </div>

      {tab === "photo" ? (
        <MealPhoto autoCamera={autoCamera} barcode={barcode} />
      ) : (
        <MealText />
      )}
    </div>
  );
}

export default function AnalyzePage() {
  return (
    <Suspense fallback={null}>
      <AnalyzeInner />
    </Suspense>
  );
}
