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

const DIRECTIONS = [
  { value: "at_least", label: "At least" },
  { value: "at_most", label: "At most" },
  { value: "around", label: "Around" },
];

const selectClass =
  "h-10 rounded-xl border border-line bg-surface/60 px-3 text-sm text-ink";

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
    <div className="space-y-8">
      <header className="flex items-end justify-between">
        <div>
          <p className="eyebrow">Goals</p>
          <h1 className="text-2xl font-semibold tracking-tight">Targets</h1>
        </div>
        <Link href="/today" className="text-sm font-medium text-leaf underline-offset-4 hover:underline">
          Done
        </Link>
      </header>

      <p className="-mt-3 text-sm text-muted">
        Set a daily goal per nutrient. Leave a value blank to clear it.
      </p>

      <section className="space-y-2.5">
        {(nutrients ?? []).map((n) => {
          const t = targetByNutrient.get(n.id);
          const direction = t?.direction ?? DEFAULT_DIRECTION[n.key] ?? "at_least";
          return (
            <div
              key={n.id}
              className="space-y-3 rounded-2xl border border-line bg-surface/40 p-3.5"
            >
              <div className="flex items-center justify-between">
                <p className="font-medium">
                  {n.display_name}
                  <span className="ml-2 text-xs text-muted">{n.unit}</span>
                </p>
                <form action={deleteNutrient}>
                  <input type="hidden" name="id" value={n.id} />
                  <Button
                    type="submit"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label={`Remove ${n.display_name}`}
                  >
                    <Trash2 className="h-4 w-4 text-muted" />
                  </Button>
                </form>
              </div>

              <form action={upsertTarget} className="flex items-center gap-2">
                <input type="hidden" name="nutrient_id" value={n.id} />
                <select name="direction" defaultValue={direction} className={`${selectClass} flex-1`}>
                  {DIRECTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <Input
                  name="target_value"
                  type="number"
                  step="any"
                  inputMode="decimal"
                  defaultValue={t?.target_value ?? ""}
                  placeholder="—"
                  className="h-10 w-24 text-right"
                />
                <Button type="submit" size="sm">
                  Save
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
            <Input id="display_name" name="display_name" placeholder="e.g. Sugar, Fiber, Sodium" required />
          </div>
          <div className="flex gap-3">
            <div className="flex-1 space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <select id="unit" name="unit" className={`${selectClass} h-11 w-full`}>
                {UNIT_OPTIONS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="kind">Kind</Label>
              <select
                id="kind"
                name="kind"
                defaultValue="micro"
                className={`${selectClass} h-11 w-full`}
              >
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
