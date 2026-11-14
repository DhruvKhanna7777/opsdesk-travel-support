"use client";

import { motion, useSpring } from "motion/react";
import { useEffect } from "react";

// Adapted from Skiper UI's Skiper61 spring mouse follow.
const spring = { mass: 0.1, damping: 10, stiffness: 131 };
const controls = 'button, [role="button"], a.od-primary, a.od-secondary';

export function ButtonPointerHighlight() {
  const x = useSpring(0, spring);
  const y = useSpring(0, spring);
  const opacity = useSpring(0, spring);

  useEffect(() => {
    const preference = window.matchMedia(
      "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
    );
    let active: Element | null = null;

    function hide() {
      active = null;
      opacity.jump(0);
    }

    function follow(event: PointerEvent) {
      if (!preference.matches || event.pointerType !== "mouse") return;
      const control = event.target instanceof Element
        ? event.target.closest(controls)
        : null;
      if (!control || control.matches(':disabled, [aria-disabled="true"]')) {
        hide();
        return;
      }
      if (control !== active) {
        active = control;
        x.jump(event.clientX);
        y.jump(event.clientY);
        opacity.set(1);
        return;
      }
      x.set(event.clientX);
      y.set(event.clientY);
    }

    document.addEventListener("pointermove", follow, { passive: true });
    document.addEventListener("pointerleave", hide);
    document.addEventListener("scroll", hide, true);
    window.addEventListener("pointerdown", hide);
    window.addEventListener("blur", hide);
    preference.addEventListener("change", hide);

    return () => {
      document.removeEventListener("pointermove", follow);
      document.removeEventListener("pointerleave", hide);
      document.removeEventListener("scroll", hide, true);
      window.removeEventListener("pointerdown", hide);
      window.removeEventListener("blur", hide);
      preference.removeEventListener("change", hide);
    };
  }, [opacity, x, y]);

  return (
    <motion.div
      aria-hidden="true"
      className="od-pointer-highlight"
      style={{ x, y, opacity }}
    />
  );
}
