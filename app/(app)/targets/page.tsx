import Link from "next/link";
import { redirect } from "next/navigation";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ensureDefaultNutrients } from "@/lib/data/setup";
import { DEFAULT_DIRECTION, UNIT_OPTIONS, KIND_OPTIONS } from "@/lib/nutrition/defaults";
import { upsertTarget, addNutrient, deleteNutrient } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const selectClass =
  "h-11 w-full rounded-xl border border-line bg-surface/60 px-3 text-sm text-ink";

export default async function TargetsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await ensureDefaultNutrients(supabase, user.id);

  const [{ data: nutrients }, { data: targets }] = await Promise.all([
    supabase
      .from("nutrient_definitions")
      .select("*")
      .eq("user_id", user.id)
      .order("sort_order")
      .order("display_name"),
    supabase
      .from("nutrient_targets")
      .select("*")
      .eq("user_id", user.id)
      .is("day_of_week", null),
  ]);

  const targetByNutrient = new Map((targets ?? []).map((t) => [t.nutrient_id, t]));

  return (
    <div className="space-y-7">
      <header className="flex items-end justify-between">
        <div>
          <p className="eyebrow">Goals</p>
          <h1 className="text-2xl font-semibold tracking-tight">Targets</h1>
        </div>
        <Link
          href="/today"
          className="text-sm font-medium text-leaf underline-offset-4 hover:underline"
        >
          Done
        </Link>
      </header>

      <section className="space-y-2">
        {(nutrients ?? []).map((n) => {
          const t = targetByNutrient.get(n.id);
          return (
            <div
              key={n.id}
              className="flex items-center gap-2 rounded-2xl border border-line bg-surface/40 px-3 py-2"
            >
              <form action={upsertTarget} className="flex flex-1 items-center gap-2">
                <input type="hidden" name="nutrient_id" value={n.id} />
                <input
                  type="hidden"
                  name="direction"
                  value={DEFAULT_DIRECTION[n.key] ?? "at_least"}
                />
                <p className="min-w-0 flex-1 truncate text-sm font-medium">
                  {n.display_name}
                  <span className="ml-1.5 text-xs text-muted">{n.unit}</span>
                </p>
                <Input
                  name="target_value"
                  type="number"
                  step="any"
                  inputMode="decimal"
                  defaultValue={t?.target_value ?? ""}
                  placeholder="—"
                  className="h-9 w-20 text-right"
                />
                <Button type="submit" size="sm">
                  Save
                </Button>
              </form>
              <form action={deleteNutrient}>
                <input type="hidden" name="id" value={n.id} />
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  aria-label={`Remove ${n.display_name}`}
                >
                  <Trash2 className="h-4 w-4 text-muted" />
                </Button>
              </form>
            </div>
          );
        })}
      </section>

      <section className="space-y-3">
        <p className="eyebrow">Add a nutrient</p>
        <form
          action={addNutrient}
          className="space-y-3 rounded-2xl border border-line bg-surface/40 p-4"
        >
          <div className="space-y-2">
            <Label htmlFor="display_name">Name</Label>
            <Input
              id="display_name"
              name="display_name"
              placeholder="e.g. Sugar, Fiber, Sodium"
              required
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1 space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <select id="unit" name="unit" className={selectClass}>
                {UNIT_OPTIONS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="kind">Kind</Label>
              <select id="kind" name="kind" defaultValue="micro" className={selectClass}>
                {KIND_OPTIONS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Button type="submit" variant="outline" className="w-full">
            Add nutrient
          </Button>
        </form>
      </section>
    </div>
  );
}
