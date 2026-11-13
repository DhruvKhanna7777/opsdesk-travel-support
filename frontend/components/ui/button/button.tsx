import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import type { ButtonProps, ButtonVariant } from "./button.types";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-action text-white enabled:hover:brightness-110 focus-visible:outline-accent-done",
  secondary:
    "bg-surface-raised text-text border border-border-strong enabled:hover:border-text-secondary focus-visible:outline-text-secondary",
  danger:
    "bg-accent-danger text-white enabled:hover:bg-accent-danger-strong focus-visible:outline-accent-danger",
  ghost:
    "bg-transparent text-text-secondary enabled:hover:text-text enabled:hover:bg-surface focus-visible:outline-text-secondary",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "primary", isLoading, disabled, children, ...props },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center justify-center gap-2 min-h-11 rounded-full px-4 py-2 text-sm font-medium transition-colors cursor-pointer",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          variantClasses[variant],
          className,
        )}
        {...props}
      >
        {isLoading && (
          <span
            aria-hidden="true"
            className="h-3.5 w-3.5 motion-safe:animate-spin rounded-full border-2 border-current border-t-transparent"
          />
        )}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";
