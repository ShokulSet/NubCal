import { redirect } from "next/navigation";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { APP_TZ } from "@/lib/config";
import { todayInTimezone } from "@/lib/nutrition/date";
import { logFood, removeMealItem } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack", "other"];
const selectClass =
  "h-11 w-full rounded-xl border border-black/10 bg-transparent px-3 dark:border-white/15";

export default async function LogPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const eatenOn = todayInTimezone(APP_TZ);

  const [{ data: foods }, { data: meals }] = await Promise.all([
    supabase
      .from("foods")
      .select("id, name, serving_size, serving_unit")
      .eq("user_id", user.id)
      .order("name"),
    supabase
      .from("meals")
      .select("id, meal_type, meal_items(id, name, quantity, serving_size, serving_unit)")
      .eq("user_id", user.id)
      .eq("eaten_on", eatenOn),
  ]);

  const items = (meals ?? []).flatMap((m) =>
    (m.meal_items ?? []).map((it) => ({ ...it, meal_type: m.meal_type })),
  );

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-muted">Log · {eatenOn}</p>
        <h1 className="text-2xl font-semibold tracking-tight">Add to today</h1>
      </header>

      {!foods || foods.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/10 p-6 text-center text-sm text-muted dark:border-white/15">
          Add a food first on the{" "}
          <a className="font-medium text-leaf" href="/foods/new">
            Foods
          </a>{" "}
          page.
        </div>
      ) : (
        <form
          action={logFood}
          className="space-y-3 rounded-2xl border border-black/10 p-4 dark:border-white/15"
        >
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
        {items.length === 0 ? (
          <p className="text-sm text-muted">Nothing logged yet.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((it) => (
              <li
                key={it.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-black/10 p-3 dark:border-white/15"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{it.name}</p>
                  <p className="text-xs text-muted">
                    {it.quantity} × {it.serving_size} {it.serving_unit} · {it.meal_type}
                  </p>
                </div>
                <form action={removeMealItem}>
                  <input type="hidden" name="id" value={it.id} />
                  <Button type="submit" variant="ghost" size="icon" aria-label="Remove item">
                    <Trash2 className="h-4 w-4 text-muted" />
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
