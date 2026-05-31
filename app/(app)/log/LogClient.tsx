"use client";

import { useOptimistic, useState } from "react";
import { ChevronDown, Minus, Plus, Trash2 } from "lucide-react";
import { logFood, removeMealItem, updateMealItem } from "./actions";
import { itemContribution } from "@/lib/nutrition/math";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack", "other"];
const selectClass = "h-11 w-full rounded-xl border border-line bg-surface/60 px-3";
const editSelectClass =
  "h-10 rounded-xl border border-line bg-surface/60 px-3 text-sm capitalize";

const r1 = (x: number) => Math.round(x * 10) / 10;

interface Item {
  id: string;
  meal_id: string;
  name: string;
  quantity: number;
  serving_size: number;
  serving_unit: string;
  meal_type: string;
  nutrients_snapshot: Record<string, number>;
}
interface Food {
  id: string;
  name: string;
  serving_size: number;
  serving_unit: string;
}

/** Calories + big-3 macros for one logged item, scaled by its quantity. */
function MacroChips({ item }: { item: Item }) {
  const c = itemContribution(item.nutrients_snapshot ?? {}, item.quantity);
  if (Object.keys(c).length === 0) return null;
  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs">
      <span className="font-medium text-ink">{Math.round(c.energy_kcal ?? 0)} kcal</span>
      <span className="text-muted">P {r1(c.protein ?? 0)}g</span>
      <span className="text-muted">C {r1(c.carbs ?? 0)}g</span>
      <span className="text-muted">F {r1(c.fat ?? 0)}g</span>
    </div>
  );
}

export function LogClient({ foods, items }: { foods: Food[]; items: Item[] }) {
  const [optimisticItems, addOptimistic] = useOptimistic(
    items,
    (state: Item[], next: Item) => [...state, next],
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState(1);
  const [editMeal, setEditMeal] = useState("other");

  async function handleLog(formData: FormData) {
    const food = foods.find((f) => f.id === String(formData.get("food_id") ?? ""));
    if (food) {
      addOptimistic({
        id: `temp-${Math.random()}`,
        meal_id: "",
        name: food.name,
        quantity: Number(formData.get("quantity") ?? 1) || 1,
        serving_size: food.serving_size,
        serving_unit: food.serving_unit,
        meal_type: String(formData.get("meal_type") ?? "other"),
        nutrients_snapshot: {},
      });
    }
    await logFood(formData);
  }

  function toggle(it: Item) {
    if (expandedId === it.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(it.id);
    setEditQty(it.quantity);
    setEditMeal(it.meal_type);
  }

  return (
    <>
      {foods.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted">
          Add a food first on the{" "}
          <a className="font-medium text-leaf" href="/foods/new">
            Foods
          </a>{" "}
          page.
        </div>
      ) : (
        <form action={handleLog} className="space-y-3 rounded-2xl border border-line bg-surface/40 p-4">
          <select name="food_id" required className={selectClass}>
            {foods.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <div className="flex gap-3">
            <Input
              name="quantity"
              type="number"
              step="any"
              inputMode="decimal"
              defaultValue={1}
              className="w-24"
              aria-label="Servings"
            />
            <select name="meal_type" defaultValue="other" className={`${selectClass} flex-1`}>
              {MEAL_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <SubmitButton className="w-full" pendingLabel="Logging…">
            Log it
          </SubmitButton>
        </form>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted">Today&apos;s items</h2>
        {optimisticItems.length === 0 ? (
          <p className="text-sm text-muted">Nothing logged yet.</p>
        ) : (
          <ul className="space-y-2">
            {optimisticItems.map((it) => {
              const pending = it.id.startsWith("temp-");
              const expanded = expandedId === it.id;
              return (
                <li
                  key={it.id}
                  className={`overflow-hidden rounded-2xl border border-line bg-surface/40 ${
                    pending ? "opacity-60" : ""
                  }`}
                >
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => toggle(it)}
                    className="flex w-full items-center justify-between gap-3 p-3 text-left"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{it.name}</p>
                      <p className="text-xs text-muted">
                        {it.quantity} × {it.serving_size} {it.serving_unit} ·{" "}
                        <span className="capitalize">{it.meal_type}</span>
                      </p>
                      {!pending && <MacroChips item={it} />}
                    </div>
                    {pending ? (
                      <span className="shrink-0 text-xs text-muted">saving…</span>
                    ) : (
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-muted transition-transform ${
                          expanded ? "rotate-180" : ""
                        }`}
                      />
                    )}
                  </button>

                  {expanded && !pending && (
                    <div className="animate-rise space-y-3 border-t border-line p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted">Servings</span>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-9 w-9"
                            aria-label="One fewer serving"
                            onClick={() =>
                              setEditQty((q) => Math.max(0, Math.round((q - 1) * 100) / 100))
                            }
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <Input
                            type="number"
                            step="any"
                            inputMode="decimal"
                            value={editQty}
                            onChange={(e) => setEditQty(Number(e.target.value) || 0)}
                            className="h-9 w-16 text-center"
                            aria-label="Servings"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-9 w-9"
                            aria-label="One more serving"
                            onClick={() => setEditQty((q) => Math.round((q + 1) * 100) / 100)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-muted">Meal</span>
                        <select
                          value={editMeal}
                          onChange={(e) => setEditMeal(e.target.value)}
                          className={editSelectClass}
                          aria-label="Meal type"
                        >
                          {MEAL_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>

                      <MacroChips item={{ ...it, quantity: editQty }} />

                      <div className="flex gap-2 pt-1">
                        <form action={updateMealItem} className="flex-1">
                          <input type="hidden" name="id" value={it.id} />
                          <input type="hidden" name="quantity" value={editQty} />
                          <input type="hidden" name="meal_type" value={editMeal} />
                          <SubmitButton className="w-full" pendingLabel="Saving…">
                            Save
                          </SubmitButton>
                        </form>
                        <form action={removeMealItem}>
                          <input type="hidden" name="id" value={it.id} />
                          <SubmitButton
                            variant="outline"
                            size="icon"
                            aria-label="Remove item"
                          >
                            <Trash2 className="h-4 w-4 text-muted" />
                          </SubmitButton>
                        </form>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
