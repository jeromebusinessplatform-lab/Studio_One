import { cn } from "@/lib/utils.ts";

export default function PrimeLogo({
  className,
  alt = "PRIME",
}: {
  className?: string;
  alt?: string;
  src?: string;
}) {
  return (
    <div
      className={cn("inline-flex items-center select-none", className)}
      role="img"
      aria-label={alt}
    >
      <img src="/primelogo.png" alt={alt} className="h-full w-auto object-contain" />
    </div>
  );
}
