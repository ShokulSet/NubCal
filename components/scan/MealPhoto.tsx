"use client";

import { useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { fileToDownscaledBase64 } from "@/lib/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MealReview, toEdit, type ApiItem, type EditItem } from "./MealReview";

export function MealPhoto() {
  const [stage, setStage] = useState<"capture" | "processing" | "review">("capture");
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState("");
  const [items, setItems] = useState<EditItem[]>([]);
  const [notFood, setNotFood] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setStage("processing");
    setError(null);
    try {
      const { base64, mimeType } = await fileToDownscaledBase64(file, 1024, 0.7);
      const res = await fetch("/api/meals/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType, hint }),
      });
      if (!res.ok) {
        setError("Couldn't analyze that photo — try a clearer shot.");
        setStage("capture");
        return;
      }
      const json = await res.json();
      if (json.not_food || !json.items?.length) {
        setNotFood(true);
        setItems([]);
      } else {
        setNotFood(false);
        setItems((json.items as ApiItem[]).map(toEdit));
      }
      setStage("review");
    } catch {
      setError("Something went wrong processing the image.");
      setStage("capture");
    }
  }

  if (stage === "processing") {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> Analyzing your meal…
      </div>
    );
  }

  if (stage === "review") {
    if (notFood || items.length === 0) {
      return (
        <div className="space-y-4 rounded-2xl border border-dashed border-black/10 p-6 text-center dark:border-white/15">
          <p className="text-sm text-muted">No food detected in that photo.</p>
          <Button onClick={() => setStage("capture")}>Try another photo</Button>
        </div>
      );
    }
    return (
      <MealReview
        items={items}
        setItems={setItems}
        backLabel="Retake"
        onBack={() => {
          setItems([]);
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
      <div className="space-y-2">
        <Label htmlFor="meal-hint">Hint (optional)</Label>
        <Input
          id="meal-hint"
          value={hint}
          onChange={(e) => setHint(e.target.value)}
          placeholder="e.g. chicken pad thai, no egg"
        />
      </div>
      <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-black/10 p-10 text-center dark:border-white/15">
        <Camera className="h-8 w-8 text-zinc-400" />
        <span className="text-sm font-medium">Take a photo of your meal</span>
        <span className="text-xs text-zinc-400">A clear, top-down shot works best.</span>
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
