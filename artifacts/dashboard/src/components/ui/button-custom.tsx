import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "destructive";
  size?: "sm" | "default" | "lg" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-xl font-medium transition-all duration-200 outline-none disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-gradient-to-b from-primary to-primary/80 text-primary-foreground shadow-[0_0_15px_-3px_hsl(var(--primary)/0.4)] hover:shadow-[0_0_25px_-3px_hsl(var(--primary)/0.5)] border border-primary-foreground/10":
              variant === "default",
            "border-2 border-border bg-transparent hover:bg-secondary hover:text-foreground text-muted-foreground":
              variant === "outline",
            "bg-transparent hover:bg-secondary text-muted-foreground hover:text-foreground":
              variant === "ghost",
            "bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground border border-destructive/20":
              variant === "destructive",
            "h-10 px-4 py-2": size === "default",
            "h-8 px-3 text-xs": size === "sm",
            "h-12 px-8 text-lg": size === "lg",
            "h-10 w-10": size === "icon",
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
