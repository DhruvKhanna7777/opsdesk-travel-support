"use client";

import { motion, useReducedMotion } from "motion/react";

export function SlidingIndicator({ id }: { id: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.span
      aria-hidden="true"
      className="od-sliding-indicator"
      layoutId={id}
      transition={{
        layout: reduceMotion === false
          ? { type: "spring", stiffness: 480, damping: 38 }
          : { duration: 0 },
      }}
    />
  );
}
