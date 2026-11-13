import { cn } from "@/lib/utils";
import type { SpinnerProps } from "./spinner.types";

export function Spinner({ className, label = "Loading" }: SpinnerProps) {
  return (
    <span role="status" className="inline-flex items-center gap-2">
      <span
        aria-hidden="true"
        className={cn(
          "h-4 w-4 motion-safe:animate-spin rounded-full border-2 border-text-muted border-t-accent-done",
          className,
        )}
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}
