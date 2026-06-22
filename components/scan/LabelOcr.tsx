"use client";

import { useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { fileToDownscaledBase64 } from "@/lib/image";
import { LabelReview, type LabelData } from "./LabelReview";

export function LabelOcr({ barcode }: { barcode?: string }) {
  const [stage, setStage] = useState<"capture" | "processing" | "review">("capture");
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<LabelData | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setStage("processing");
    setError(null);
    try {
      const { base64, mimeType } = await fileToDownscaledBase64(file);
      const res = await fetch("/api/labels/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType }),
      });
      if (!res.ok) {
        setError("Couldn't read that label — try a clearer, straight-on photo.");
        setStage("capture");
        return;
      }
      const json = await res.json();
      setData(json.label as LabelData);
      setStage("review");
    } catch {
      setError("Something went wrong processing the image.");
      setStage("capture");
    }
  }

  if (stage === "processing") {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> Reading the label…
      </div>
    );
  }

  if (stage === "review" && data) {
    return (
      <LabelReview
        data={data}
        setData={setData}
        barcode={barcode}
        onRetake={() => {
          setData(null);
          setStage("capture");
        }}
      />
    );
  }

  // capture stage
  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/40">
          {error}
        </p>
      )}
      <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-line p-10 text-center">
        <Camera className="h-8 w-8 text-muted" />
        <span className="text-sm font-medium">Take a photo of the nutrition label</span>
        <span className="text-xs text-muted">
          Straight-on, label filling the frame. Thai or English.
        </span>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={onFile}
        />
      </label>
    </div>
  );
}
