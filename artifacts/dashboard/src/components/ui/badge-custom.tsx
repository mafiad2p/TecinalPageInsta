import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" }) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors border",
        {
          "bg-primary/10 text-primary border-primary/20": variant === "default",
          "bg-secondary text-secondary-foreground border-transparent": variant === "secondary",
          "bg-destructive/10 text-destructive border-destructive/20": variant === "destructive",
          "text-foreground border-border": variant === "outline",
          "bg-emerald-500/10 text-emerald-400 border-emerald-500/20": variant === "success",
          "bg-amber-500/10 text-amber-400 border-amber-500/20": variant === "warning",
        },
        className
      )}
      {...props}
    />
  );
}
