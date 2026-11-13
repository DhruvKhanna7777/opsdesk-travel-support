import { cn } from "@/lib/utils";
import type { CardProps } from "./card.types";

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-border bg-surface p-4 sm:p-6",
        className,
      )}
      {...props}
    />
  );
}
