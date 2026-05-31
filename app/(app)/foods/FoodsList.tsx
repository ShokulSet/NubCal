"use client";

import { useState } from "react";
import { ChevronDown, Trash2 } from "lucide-react";
import { updateFood, deleteFood } from "./actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";

const SERVING_UNITS = ["g", "ml", "piece", "cup", "tbsp", "tsp"];

const dots =
  "mx-2 h-[3px] flex-1 self-center opacity-50 [background-image:radial-gradient(circle,var(--color-muted)_1px,transparent_1px)] [background-size:8px_3px]";

interface NutrientDef {
  id: string;
  key: string;
  display_name: string;
  unit: string;
}
interface Food {
  id: string;
  name: string;
  brand: string | null;
  serving_size: number;
  serving_unit: string;
  nutrients: Record<string, number>;
}

export function FoodsList({
  foods,
  nutrients,
}: {
  foods: Food[];
  nutrients: NutrientDef[];
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <ul className="space-y-2">
      {foods.map((f, i) => {
        const expanded = expandedId === f.id;
        const kcal = f.nutrients?.energy_kcal;
        const units = SERVING_UNITS.includes(f.serving_unit)
          ? SERVING_UNITS
          : [f.serving_unit, ...SERVING_UNITS];
        return (
          <li
            key={f.id}
            className="animate-rise overflow-hidden rounded-2xl border border-line bg-surface/40"
            style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}
          >
            <button
              type="button"
              onClick={() => setExpandedId(expanded ? null : f.id)}
              className="flex w-full items-center justify-between gap-3 p-3 text-left"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{f.name}</p>
                <p className="text-xs text-muted">
                  {f.brand ? `${f.brand} · ` : ""}
                  {f.serving_size} {f.serving_unit}
                  {kcal != null ? ` · ${Math.round(kcal)} kcal` : ""}
                </p>
              </div>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-muted transition-transform ${
                  expanded ? "rotate-180" : ""
                }`}
              />
            </button>

            {expanded && (
              <div className="animate-rise border-t border-line p-3">
                <form action={updateFood} className="space-y-3">
                  <input type="hidden" name="id" value={f.id} />

                  <div className="overflow-hidden rounded-2xl border border-line bg-surface/50">
                    <label className="flex items-center gap-3 px-3 py-2.5">
                      <span className="shrink-0 text-sm font-medium">Name</span>
                      <Input
                        name="name"
                        required
                        defaultValue={f.name}
                        className="h-9 min-w-0 flex-1 border-0 bg-transparent text-right shadow-none focus-visible:ring-0"
                      />
                    </label>
                    <label className="flex items-center gap-3 border-t border-line px-3 py-2.5">
                      <span className="shrink-0 text-sm font-medium">Brand</span>
                      <Input
                        name="brand"
                        placeholder="optional"
                        defaultValue={f.brand ?? ""}
                        className="h-9 min-w-0 flex-1 border-0 bg-transparent text-right shadow-none focus-visible:ring-0"
                      />
                    </label>
                    <div className="flex items-center gap-1 border-t border-line px-3 py-2.5">
                      <span className="shrink-0 text-sm font-medium">Serving</span>
                      <span className={dots} />
                      <Input
                        name="serving_size"
                        type="number"
                        step="any"
                        inputMode="decimal"
                        defaultValue={f.serving_size}
                        aria-label="Serving size"
                        className="h-9 w-16 border-0 bg-transparent text-right font-mono shadow-none focus-visible:ring-0"
                      />
                      <select
                        name="serving_unit"
                        defaultValue={f.serving_unit}
                        aria-label="Serving unit"
                        className="ml-1 bg-transparent font-mono text-sm text-muted outline-none focus:text-leaf"
                      >
                        {units.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-line bg-surface/50">
                    {nutrients.map((n, j) => (
                      <div
                        key={n.id}
                        className={`flex items-center gap-1 px-3 py-2.5 ${
                          j > 0 ? "border-t border-line" : ""
                        }`}
                      >
                        <span className="text-sm font-medium">{n.display_name}</span>
                        <span className={dots} />
                        <Input
                          name={`amount_${n.id}`}
                          type="number"
                          step="any"
                          inputMode="decimal"
                          placeholder="—"
                          defaultValue={f.nutrients?.[n.key] ?? ""}
                          aria-label={`${n.display_name} per serving`}
                          className="h-9 w-16 border-0 bg-transparent text-right font-mono shadow-none focus-visible:ring-0"
                        />
                        <span className="w-7 text-xs text-muted">{n.unit}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 pt-1">
                    <SubmitButton className="flex-1" pendingLabel="Saving…">
                      Save
                    </SubmitButton>
                  </div>
                </form>

                <form action={deleteFood} className="mt-2">
                  <input type="hidden" name="id" value={f.id} />
                  <SubmitButton
                    variant="ghost"
                    className="w-full text-chili hover:bg-chili/[0.06]"
                    pendingLabel="Deleting…"
                  >
                    <Trash2 className="h-4 w-4" /> Delete food
                  </SubmitButton>
                </form>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
