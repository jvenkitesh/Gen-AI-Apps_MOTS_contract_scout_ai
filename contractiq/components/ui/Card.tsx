import { cn } from "@/lib/utils/cn";

// docs/design.md: Cards/panels = radius-lg (8px), White surface.
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-lg bg-white", className)} {...props} />;
}
