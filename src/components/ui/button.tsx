import * as React from "react";
import { cn } from "@/lib/utils.ts";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const variantClasses = {
      default: "bg-black text-white shadow hover:bg-neutral-800",
      destructive: "bg-red-500 text-white shadow-sm hover:bg-red-600",
      outline: "border border-neutral-300 bg-white text-neutral-900 shadow-xs hover:bg-neutral-100",
      secondary: "bg-neutral-100 text-neutral-900 shadow-xs hover:bg-neutral-200",
      ghost: "hover:bg-neutral-100 text-neutral-900",
      link: "text-neutral-900 underline-offset-4 hover:underline",
    }[variant];

    const sizeClasses = {
      default: "h-9 px-4 py-2 text-sm",
      sm: "h-8 rounded-md px-3 text-xs",
      lg: "h-10 rounded-md px-8 text-base",
      icon: "h-9 w-9",
    }[size];

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-950 disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
          variantClasses,
          sizeClasses,
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
