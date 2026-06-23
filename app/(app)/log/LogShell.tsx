"use client";

import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { LogClient } from "./LogClient";
import { FoodsList } from "../foods/FoodsList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Item {
  id: string;
  meal_id: string;
  name: string;
  quantity: number;
  serving_size: number;
  serving_unit: string;
  nutrients_snapshot: Record<string, number>;
}
interface LogFood {
  id: string;
  name: string;
  serving_size: number;
  serving_unit: string;
}
interface NutrientDef {
  id: string;
  key: string;
  display_name: string;
  unit: string;
}
interface LibraryFood {
  id: string;
  name: string;
  brand: string | null;
  serving_size: number;
  serving_unit: string;
  nutrients: Record<string, number>;
}

type View = "log" | "foods";

export interface LogShellProps {
  view: View;
  eatenOn: string;
  today: string;
  /** Lightweight list that feeds the "log a food" dropdown. */
  foods: LogFood[];
  items: Item[];
  /** Library data — only populated when the Foods view is active. */
  libraryFoods: LibraryFood[];
  nutrientDefs: NutrientDef[];
  query: string;
  /** True when a search term filtered the library to zero results. */
  searched: boolean;
}

/** Preserve the viewed day across the segmented toggle so back/forward stays sane. */
function viewHref(view: View, eatenOn: string, today: string): string {
  const params = new URLSearchParams();
  if (view === "foods") params.set("view", "foods");
  if (eatenOn !== today) params.set("date", eatenOn);
  const qs = params.toString();
  return qs ? `/log?${qs}` : "/log";
}

function SegToggle({
  view,
  eatenOn,
  today,
}: {
  view: View;
  eatenOn: string;
  today: string;
}) {
  const tabs: { id: View; label: string }[] = [
    { id: "log", label: "Log" },
    { id: "foods", label: "Foods" },
  ];
  return (
    <div
      role="tablist"
      aria-label="Log or Foods"
      className="flex gap-1 rounded-2xl border border-line bg-surface/40 p-1"
    >
      {tabs.map((t) => {
        const active = view === t.id;
        return (
          <Link
            key={t.id}
            role="tab"
            aria-selected={active}
            href={viewHref(t.id, eatenOn, today)}
            scroll={false}
            className={cn(
              "flex-1 rounded-xl py-2 text-center text-sm font-semibold transition-colors",
              active
                ? "bg-leaf text-paper shadow-sm"
                : "text-muted hover:text-ink",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}

export function LogShell({
  view,
  eatenOn,
  today,
  foods,
  items,
  libraryFoods,
  nutrientDefs,
  query,
  searched,
}: LogShellProps) {
  return (
    <div className="space-y-6">
      <SegToggle view={view} eatenOn={eatenOn} today={today} />

      {view === "foods" ? (
        <div className="space-y-6">
          <header className="flex items-end justify-between">
            <div>
              <p className="eyebrow">Library</p>
              <h1 className="text-[2.2rem] leading-none">Your foods</h1>
            </div>
            <Link href="/foods/new">
              <Button size="sm">
                <Plus className="h-4 w-4" /> Add
              </Button>
            </Link>
          </header>

          <form className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input type="hidden" name="view" value="foods" />
            <Input
              name="q"
              defaultValue={query}
              placeholder="Search foods…"
              className="pl-10"
              aria-label="Search foods"
            />
          </form>

          {libraryFoods.length === 0 ? (
            <div className="rounded-2xl border border-line bg-surface/40 p-8 text-center text-sm text-muted">
              {searched
                ? `No foods match “${query}”.`
                : "No foods yet. Add one to start logging."}
            </div>
          ) : (
            <FoodsList foods={libraryFoods} nutrients={nutrientDefs} />
          )}
        </div>
      ) : (
        <LogClient foods={foods} items={items} eatenOn={eatenOn} today={today} />
      )}
    </div>
  );
}
