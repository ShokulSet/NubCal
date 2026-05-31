"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MealReview, toEdit, type ApiItem, type EditItem } from "./MealReview";

export function MealText() {
  const [stage, setStage] = useState<"input" | "processing" | "review">("input");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<EditItem[]>([]);
  const [notFood, setNotFood] = useState(false);

  async function estimate() {
    if (!text.trim()) return;
    setStage("processing");
    setError(null);
    try {
      const res = await fetch("/api/meals/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        setError("Couldn't estimate that — try rephrasing or adding amounts.");
        setStage("input");
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
      setError("Something went wrong. Please try again.");
      setStage("input");
    }
  }

  if (stage === "processing") {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> Estimating from your description…
      </div>
    );
  }

  if (stage === "review") {
    if (notFood || items.length === 0) {
      return (
        <div className="space-y-4 rounded-2xl border border-dashed border-line p-6 text-center">
          <p className="text-sm text-muted">No food found in that description.</p>
          <Button onClick={() => setStage("input")}>Edit description</Button>
        </div>
      );
    }
    return (
      <MealReview
        items={items}
        setItems={setItems}
        backLabel="Edit text"
        onBack={() => setStage("input")}
      />
    );
  }

  // input stage
  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/40">
          {error}
        </p>
      )}
      <div className="space-y-2">
        <Label htmlFor="meal-text">What did you eat?</Label>
        <textarea
          id="meal-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder="e.g. 2 หมั่นโถว, a bowl of pad kra pao with chicken over rice, and a glass of soy milk"
          className="w-full rounded-xl border border-line bg-surface/60 p-3 text-sm text-ink outline-none placeholder:text-muted/60 focus:border-leaf"
        />
        <p className="text-xs text-muted">
          Describe the dishes and rough amounts — the more specific, the better the estimate.
        </p>
      </div>
      <Button className="w-full" onClick={estimate} disabled={!text.trim()}>
        <Sparkles className="h-4 w-4" /> Estimate
      </Button>
    </div>
  );
}
