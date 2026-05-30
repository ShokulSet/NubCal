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
      "flex h-11 w-full rounded-xl border border-line bg-surface/60 px-4 text-base text-ink outline-none transition-colors placeholder:text-muted/70 focus-visible:border-leaf/50 focus-visible:ring-2 focus-visible:ring-leaf/20 disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";
