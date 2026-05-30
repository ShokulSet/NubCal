"use client";

import { useOptimistic } from "react";
import { Trash2 } from "lucide-react";
import { logFood, removeMealItem } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack", "other"];
const selectClass = "h-11 w-full rounded-xl border border-line bg-surface/60 px-3";

interface Item {
  id: string;
  name: string;
  quantity: number;
  serving_size: number;
  serving_unit: string;
  meal_type: string;
}
interface Food {
  id: string;
  name: string;
  serving_size: number;
  serving_unit: string;
}

export function LogClient({ foods, items }: { foods: Food[]; items: Item[] }) {
  const [optimisticItems, addOptimistic] = useOptimistic(
    items,
    (state: Item[], next: Item) => [...state, next],
  );

  async function handleLog(formData: FormData) {
    const food = foods.find((f) => f.id === String(formData.get("food_id") ?? ""));
    if (food) {
      addOptimistic({
        id: `temp-${Math.random()}`,
        name: food.name,
        quantity: Number(formData.get("quantity") ?? 1) || 1,
        serving_size: food.serving_size,
        serving_unit: food.serving_unit,
        meal_type: String(formData.get("meal_type") ?? "other"),
      });
    }
    await logFood(formData);
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
          <Button type="submit" className="w-full">
            Log it
          </Button>
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
              return (
                <li
                  key={it.id}
                  className={`flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface/40 p-3 ${
                    pending ? "opacity-60" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{it.name}</p>
                    <p className="text-xs text-muted">
                      {it.quantity} × {it.serving_size} {it.serving_unit} · {it.meal_type}
                    </p>
                  </div>
                  {pending ? (
                    <span className="shrink-0 text-xs text-muted">saving…</span>
                  ) : (
                    <form action={removeMealItem}>
                      <input type="hidden" name="id" value={it.id} />
                      <Button type="submit" variant="ghost" size="icon" aria-label="Remove item">
                        <Trash2 className="h-4 w-4 text-muted" />
                      </Button>
                    </form>
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
