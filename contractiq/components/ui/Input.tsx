import { cn } from "@/lib/utils/cn";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-md border border-grey-200 px-4 py-2.5 text-body-lg text-grey-900",
        "focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500",
        "disabled:opacity-60 disabled:cursor-not-allowed",
        className
      )}
      {...props}
    />
  );
}
