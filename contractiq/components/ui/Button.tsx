import { cn } from "@/lib/utils/cn";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
};

// docs/design.md: Interactive/brand = Blue 500; radius-md (6px) for buttons.
export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "rounded-md px-6 py-2.5 text-body-lg font-medium transition",
        "disabled:opacity-60 disabled:cursor-not-allowed",
        variant === "primary" && "bg-blue-500 text-white hover:bg-blue-600",
        variant === "ghost" &&
          "border border-grey-200 text-grey-900 hover:bg-grey-50",
        className
      )}
      {...props}
    />
  );
}
