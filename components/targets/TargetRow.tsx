"use client";

import { useRef, useState, useTransition } from "react";
import { Check, Trash2 } from "lucide-react";
import { setTargetValue, removeNutrient } from "@/app/(app)/targets/actions";

export function TargetRow({
  nutrientId,
  direction,
  name,
  unit,
  initialValue,
  index,
}: {
  nutrientId: string;
  direction: string;
  name: string;
  unit: string;
  initialValue: string;
  index: number;
}) {
  const [value, setValue] = useState(initialValue);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const last = useRef(initialValue);

  function commit() {
    const v = value.trim();
    if (v === last.current.trim()) return;
    last.current = v;
    start(async () => {
      await setTargetValue(nutrientId, direction, v);
      setSaved(true);
      setTimeout(() => setSaved(false), 1400);
    });
  }

  return (
    <div
      className="animate-rise flex items-center gap-2 px-4 py-3.5"
      style={{ animationDelay: `${index * 45}ms` }}
    >
      <span className="font-medium">{name}</span>

      {/* dotted menu-style leader */}
      <span
        className="mx-1 h-[3px] flex-1 self-center opacity-50"
        style={{
          backgroundImage: "radial-gradient(circle, var(--color-muted) 1px, transparent 1px)",
          backgroundSize: "8px 3px",
        }}
      />

      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        inputMode="decimal"
        placeholder="—"
        aria-label={`${name} goal`}
        className="w-14 bg-transparent text-right font-mono text-base tabular-nums text-ink caret-leaf outline-none placeholder:text-muted/50 focus:text-leaf"
      />
      <span className="w-7 text-xs text-muted">{unit}</span>

      <span className="flex h-7 w-7 items-center justify-center">
        {saved ? (
          <Check className={`h-4 w-4 text-leaf ${pending ? "opacity-50" : ""}`} />
        ) : (
          <button
            type="button"
            onClick={() => start(() => removeNutrient(nutrientId))}
            className="text-muted/60 transition-colors hover:text-chili"
            aria-label={`Remove ${name}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </span>
    </div>
  );
}
