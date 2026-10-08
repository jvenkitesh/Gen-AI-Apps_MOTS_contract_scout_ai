import { cn } from "@/lib/utils/cn";

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  color?: "green" | "red" | "yellow" | "blue" | "violet";
};

// docs/design.md "Semantic Status Badge" pattern:
// bg [Color]-50, border [Color]-200, text [Color]-700, radius-sm (4px), padding 2px 8px.
const colorClasses: Record<NonNullable<BadgeProps["color"]>, string> = {
  green: "bg-green-50 border-green-200 text-green-700",
  red: "bg-red-50 border-red-200 text-red-700",
  yellow: "bg-yellow-50 border-yellow-200 text-yellow-800",
  blue: "bg-blue-50 border-blue-200 text-blue-700",
  violet: "bg-violet-50 border-violet-200 text-violet-700",
};

export function Badge({ color = "blue", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-block rounded-sm border px-2 py-0.5 text-body-sm font-medium",
        colorClasses[color],
        className
      )}
      {...props}
    />
  );
}
