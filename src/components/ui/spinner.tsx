import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils.ts";

export interface SpinnerProps extends React.HTMLAttributes<SVGSVGElement> {
  className?: string;
  size?: number;
}

export function Spinner({ className, size = 20, ...props }: SpinnerProps) {
  return (
    <Loader2
      size={size}
      className={cn("animate-spin text-neutral-500", className)}
      {...props}
    />
  );
}
