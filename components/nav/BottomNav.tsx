"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, NotebookPen, ScanLine, Apple, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/today", label: "Today", icon: Home },
  { href: "/log", label: "Log", icon: NotebookPen },
  { href: "/scan", label: "Scan", icon: ScanLine },
  { href: "/foods", label: "Foods", icon: Apple },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-black/5 bg-white/90 backdrop-blur dark:border-white/10 dark:bg-black/80"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium transition-colors",
                active
                  ? "text-emerald-600"
                  : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300",
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
