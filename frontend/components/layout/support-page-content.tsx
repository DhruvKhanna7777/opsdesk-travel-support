"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

export function SupportPageContent({
  children,
  className,
}: {
  children: ReactNode;
  className: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduceMotion === false ? { y: 8 } : false}
      animate={{ y: 0 }}
      transition={{ duration: reduceMotion === false ? 0.22 : 0, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
