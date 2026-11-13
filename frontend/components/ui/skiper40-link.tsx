import type { ComponentProps, ReactNode } from "react";
import clsx from "clsx";
import Link from "next/link";

// Adapted from Skiper UI's Skiper40 (Link000) by @gurvinder-singh02.
// https://www.skiper-ui.com/v1/skiper40
export function Skiper40Link({
  children,
  className,
  leadingIcon,
  ...props
}: ComponentProps<typeof Link> & { leadingIcon?: ReactNode }) {
  return (
    <Link {...props} className={clsx("group", className)}>
      {leadingIcon}
      <span className="relative inline-block before:pointer-events-none before:absolute before:inset-x-0 before:-bottom-0.5 before:h-px before:origin-right before:scale-x-0 before:bg-current before:transition-transform before:duration-300 before:content-[''] group-hover:before:origin-left group-hover:before:scale-x-100 group-focus-visible:before:origin-left group-focus-visible:before:scale-x-100 motion-reduce:before:transition-none">
        {children}
      </span>
    </Link>
  );
}
