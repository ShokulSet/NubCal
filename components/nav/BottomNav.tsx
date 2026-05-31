"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Apple, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/today", label: "Today", icon: Home },
  { href: "/foods", label: "Foods", icon: Apple },
  { href: "/settings", label: "You", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/85 backdrop-blur-md"
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
                "relative flex flex-1 flex-col items-center gap-1 py-2.5 transition-colors",
                active ? "text-leaf" : "text-muted hover:text-ink",
              )}
            >
              {active && (
                <span className="absolute top-0 h-[2px] w-7 rounded-full bg-leaf" />
              )}
              <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.9} />
              <span className="text-[10px] font-semibold uppercase tracking-[0.06em]">
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
