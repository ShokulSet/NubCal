"use client";

import Link from "next/link";
import { useOptimistic, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Minus, Plus, Trash2 } from "lucide-react";
import { logFood, removeMealItem, updateMealItem } from "./actions";
import { itemContribution } from "@/lib/nutrition/math";
import { addDaysIso } from "@/lib/nutrition/date";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";

const selectClass = "h-11 w-full rounded-xl border border-line bg-surface/60 px-3";

const r1 = (x: number) => Math.round(x * 10) / 10;

interface Item {
  id: string;
  meal_id: string;
  name: string;
  quantity: number;
  serving_size: number;
  serving_unit: string;
  nutrients_snapshot: Record<string, number>;
}
interface Food {
  id: string;
  name: string;
  serving_size: number;
  serving_unit: string;
}

type OptimisticAction =
  | { type: "add"; item: Item }
  | { type: "remove"; id: string }
  | { type: "update"; id: string; quantity: number };

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

export function LogClient({
  foods,
  items,
  eatenOn,
  today,
}: {
  foods: Food[];
  items: Item[];
  eatenOn: string;
  today: string;
}) {
  const [optimisticItems, applyOptimistic] = useOptimistic(
    items,
    (state: Item[], action: OptimisticAction) => {
      switch (action.type) {
        case "add":
          return [...state, action.item];
        case "remove":
          return state.filter((it) => it.id !== action.id);
        case "update":
          return state.map((it) =>
            it.id === action.id ? { ...it, quantity: action.quantity } : it,
          );
      }
    },
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // String-backed so a partial decimal like "0." survives a keystroke.
  const [editQty, setEditQty] = useState("1");

  const editQtyNum = Number(editQty) || 0;

  const isToday = eatenOn === today;
  const prevIso = addDaysIso(eatenOn, -1);
  const nextIso = addDaysIso(eatenOn, 1);
  const dateLabel = new Date(`${eatenOn}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
  });

  async function handleLog(formData: FormData) {
    const food = foods.find((f) => f.id === String(formData.get("food_id") ?? ""));
    if (food) {
      applyOptimistic({
        type: "add",
        item: {
          id: `temp-${Math.random()}`,
          meal_id: "",
          name: food.name,
          quantity: Number(formData.get("quantity") ?? 1) || 1,
          serving_size: food.serving_size,
          serving_unit: food.serving_unit,
          nutrients_snapshot: {},
        },
      });
    }
    await logFood(formData);
  }

  async function handleUpdate(formData: FormData) {
    applyOptimistic({
      type: "update",
      id: String(formData.get("id") ?? ""),
      quantity: Number(formData.get("quantity")) || 0,
    });
    setExpandedId(null);
    await updateMealItem(formData);
  }

  async function handleRemove(formData: FormData) {
    applyOptimistic({ type: "remove", id: String(formData.get("id") ?? "") });
    setExpandedId(null);
    await removeMealItem(formData);
  }

  function toggle(it: Item) {
    if (expandedId === it.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(it.id);
    setEditQty(String(it.quantity));
  }

  return (
    <>
      <header className="space-y-3">
        <p className="eyebrow">Log</p>
        <div className="flex items-center justify-between gap-3">
          <Link
            href={`/log?date=${prevIso}`}
            aria-label="Previous day"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line text-muted hover:bg-black/[.03] dark:hover:bg-white/[.04]"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-center text-[1.7rem] leading-none">
            {isToday ? "Today" : dateLabel}
          </h1>
          {isToday ? (
            <span
              aria-hidden
              className="h-10 w-10 shrink-0 rounded-xl border border-transparent"
            />
          ) : (
            <Link
              href={`/log?date=${nextIso}`}
              aria-label="Next day"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line text-muted hover:bg-black/[.03] dark:hover:bg-white/[.04]"
            >
              <ChevronRight className="h-5 w-5" />
            </Link>
          )}
        </div>
      </header>

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
          <input type="hidden" name="eaten_on" value={eatenOn} />
          <select name="food_id" required className={selectClass}>
            {foods.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <Input
            name="quantity"
            type="number"
            step="any"
            inputMode="decimal"
            defaultValue={1}
            className="w-full"
            aria-label="Servings"
          />
          <SubmitButton className="w-full" pendingLabel="Logging…">
            Log it
          </SubmitButton>
        </form>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted">
          {isToday ? "Today's items" : `Items for ${dateLabel}`}
        </h2>
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
                        {it.quantity} × {it.serving_size} {it.serving_unit}
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
                              setEditQty((q) =>
                                String(Math.max(0, Math.round((Number(q) - 1) * 100) / 100)),
                              )
                            }
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={editQty}
                            onChange={(e) => setEditQty(e.target.value.replace(/[^\d.]/g, ""))}
                            className="h-9 w-16 text-center"
                            aria-label="Servings"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-9 w-9"
                            aria-label="One more serving"
                            onClick={() =>
                              setEditQty((q) => String(Math.round((Number(q) + 1) * 100) / 100))
                            }
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <MacroChips item={{ ...it, quantity: editQtyNum }} />

                      <div className="flex gap-2 pt-1">
                        <form action={handleUpdate} className="flex-1">
                          <input type="hidden" name="id" value={it.id} />
                          <input type="hidden" name="quantity" value={editQty} />
                          <SubmitButton className="w-full" pendingLabel="Saving…">
                            Save
                          </SubmitButton>
                        </form>
                        <form action={handleRemove}>
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
