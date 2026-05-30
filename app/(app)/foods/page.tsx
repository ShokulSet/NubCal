import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { deleteFood } from "./actions";
import { Button } from "@/components/ui/button";

export default async function FoodsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: foods } = await supabase
    .from("foods")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-sm text-muted">Foods</p>
          <h1 className="text-2xl font-semibold tracking-tight">Your foods</h1>
        </div>
        <Link href="/foods/new">
          <Button size="sm">
            <Plus className="h-4 w-4" /> Add
          </Button>
        </Link>
      </header>

      {!foods || foods.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/10 p-8 text-center text-sm text-muted dark:border-white/15">
          No foods yet. Add one to start logging.
        </div>
      ) : (
        <ul className="space-y-2">
          {foods.map((f) => {
            const nutrients = (f.nutrients ?? {}) as Record<string, number>;
            const kcal = nutrients.energy_kcal;
            return (
              <li
                key={f.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-black/10 p-3 dark:border-white/15"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{f.name}</p>
                  <p className="text-xs text-muted">
                    {f.brand ? `${f.brand} · ` : ""}
                    {f.serving_size} {f.serving_unit}
                    {kcal != null ? ` · ${Math.round(kcal)} kcal` : ""}
                  </p>
                </div>
                <form action={deleteFood}>
                  <input type="hidden" name="id" value={f.id} />
                  <Button type="submit" variant="ghost" size="icon" aria-label="Delete food">
                    <Trash2 className="h-4 w-4 text-muted" />
                  </Button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
