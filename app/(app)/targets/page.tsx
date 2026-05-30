import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureDefaultNutrients } from "@/lib/data/setup";
import { DEFAULT_DIRECTION, UNIT_OPTIONS, KIND_OPTIONS } from "@/lib/nutrition/defaults";
import { upsertTarget, addNutrient } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DIRECTIONS = [
  { value: "at_least", label: "At least" },
  { value: "at_most", label: "At most" },
  { value: "around", label: "Around" },
];

const selectClass =
  "h-10 rounded-xl border border-black/10 bg-transparent px-2 text-sm dark:border-white/15";

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
          <p className="text-sm text-zinc-500">Targets</p>
          <h1 className="text-2xl font-semibold tracking-tight">Nutrient targets</h1>
        </div>
        <Link href="/today" className="text-sm font-medium text-emerald-600">
          Done
        </Link>
      </header>

      <section className="space-y-3">
        {(nutrients ?? []).map((n) => {
          const t = targetByNutrient.get(n.id);
          const direction = t?.direction ?? DEFAULT_DIRECTION[n.key] ?? "at_least";
          return (
            <form
              key={n.id}
              action={upsertTarget}
              className="rounded-2xl border border-black/10 p-3 dark:border-white/15"
            >
              <input type="hidden" name="nutrient_id" value={n.id} />
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">{n.display_name}</p>
                  <p className="text-xs text-zinc-400">{n.unit}</p>
                </div>
                <div className="flex items-center gap-2">
                  <select name="direction" defaultValue={direction} className={selectClass}>
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
                    className="h-10 w-20 text-right"
                  />
                  <Button type="submit" size="sm">
                    Save
                  </Button>
                </div>
              </div>
            </form>
          );
        })}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-500">Add a custom nutrient</h2>
        <form
          action={addNutrient}
          className="space-y-3 rounded-2xl border border-black/10 p-4 dark:border-white/15"
        >
          <div className="space-y-2">
            <Label htmlFor="display_name">Name</Label>
            <Input id="display_name" name="display_name" placeholder="e.g. Potassium" required />
          </div>
          <div className="flex gap-3">
            <div className="flex-1 space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <select id="unit" name="unit" className={`${selectClass} h-11 w-full px-3`}>
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
                className={`${selectClass} h-11 w-full px-3`}
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
