import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    ref={ref}
    className={cn(
      "flex h-11 w-full rounded-xl border border-black/10 bg-transparent px-4 text-base outline-none transition-colors placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-emerald-500/40 disabled:opacity-50 dark:border-white/15",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";
