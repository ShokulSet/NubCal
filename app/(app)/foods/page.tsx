import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Trash2, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAuthUserId } from "@/lib/supabase/auth";
import { deleteFood } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default async function FoodsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();
  const userId = await getAuthUserId(supabase);
  if (!userId) redirect("/login");

  let query = supabase
    .from("foods")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const term = q?.trim().replace(/[%,()]/g, " ");
  if (term) {
    query = query.or(`name.ilike.%${term}%,name_th.ilike.%${term}%`);
  }
  const { data: foods } = await query;

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <p className="eyebrow">Library</p>
          <h1 className="text-2xl font-semibold tracking-tight">Your foods</h1>
        </div>
        <Link href="/foods/new">
          <Button size="sm">
            <Plus className="h-4 w-4" /> Add
          </Button>
        </Link>
      </header>

      <form className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search foods…"
          className="pl-10"
          aria-label="Search foods"
        />
      </form>

      {!foods || foods.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface/40 p-8 text-center text-sm text-muted">
          {term ? `No foods match “${q}”.` : "No foods yet. Add one to start logging."}
        </div>
      ) : (
        <ul className="space-y-2">
          {foods.map((f) => {
            const nutrients = (f.nutrients ?? {}) as Record<string, number>;
            const kcal = nutrients.energy_kcal;
            return (
              <li
                key={f.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface/40 p-3"
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
