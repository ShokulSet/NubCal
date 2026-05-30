"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Sparkles, FileText } from "lucide-react";
import { LabelOcr } from "@/components/scan/LabelOcr";
import { MealPhoto } from "@/components/scan/MealPhoto";
import { cn } from "@/lib/utils";

function AnalyzeInner() {
  const sp = useSearchParams();
  const [tab, setTab] = useState<"meal" | "label">(
    sp.get("tab") === "label" ? "label" : "meal",
  );
  const barcode = sp.get("barcode") ?? undefined;

  const tabClass = (active: boolean) =>
    cn(
      "flex items-center justify-center gap-1.5 rounded-full py-2 text-sm font-medium transition-colors",
      active ? "bg-leaf text-paper" : "text-muted hover:text-ink",
    );

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">AI capture</p>
        <h1 className="text-2xl font-semibold tracking-tight">Analyze</h1>
      </header>

      <div className="grid grid-cols-2 gap-1 rounded-full border border-line bg-surface/40 p-1">
        <button type="button" onClick={() => setTab("meal")} className={tabClass(tab === "meal")}>
          <Sparkles className="h-4 w-4" /> Meal photo
        </button>
        <button type="button" onClick={() => setTab("label")} className={tabClass(tab === "label")}>
          <FileText className="h-4 w-4" /> Label
        </button>
      </div>

      {tab === "meal" ? <MealPhoto /> : <LabelOcr barcode={barcode} />}
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
