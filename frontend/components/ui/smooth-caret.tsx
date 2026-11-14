"use client";

import { motion, useSpring } from "motion/react";
import { useEffect, useRef } from "react";

// Adapted from Skiper UI's Skiper106 measured spring caret for text search.
export function SmoothCaret() {
  const caret = useRef<HTMLSpanElement>(null);
  const x = useSpring(0, { stiffness: 500, damping: 30, mass: 0.5 });

  useEffect(() => {
    const marker = caret.current;
    const input = marker?.previousElementSibling;
    const context = document.createElement("canvas").getContext("2d");
    if (!marker || !(input instanceof HTMLInputElement) || !context) return;

    const preference = window.matchMedia(
      "(pointer: fine) and (prefers-reduced-motion: no-preference) and (forced-colors: none)",
    );
    let composing = false;
    let visible = false;

    function sync() {
      if (!marker || !(input instanceof HTMLInputElement) || !context) return;
      const style = getComputedStyle(input);
      const index = input.selectionStart;
      const eligible =
        preference.matches &&
        document.activeElement === input &&
        !composing &&
        style.direction === "ltr" &&
        index !== null &&
        index === input.selectionEnd &&
        /^[\x20-\x7e]*$/.test(input.value);
      if (eligible) {
        context.font = style.font;
        const width = context.measureText(input.value.slice(0, index)).width;
        const left = width + (parseFloat(style.paddingLeft) || 0) - input.scrollLeft;
        const position = input.offsetLeft + left;
        if (left >= 0 && left < input.clientWidth) {
          if (visible) x.set(position);
          else x.jump(position);
          visible = true;
          marker.hidden = false;
          input.dataset.smoothCaret = "true";
          return;
        }
      }
      visible = false;
      marker.hidden = true;
      delete input.dataset.smoothCaret;
    }

    function startComposition() {
      composing = true;
      sync();
    }

    function endComposition() {
      composing = false;
      sync();
    }

    const events = ["input", "focus", "blur", "scroll"] as const;
    for (const event of events) input.addEventListener(event, sync);
    input.addEventListener("compositionstart", startComposition);
    input.addEventListener("compositionend", endComposition);
    document.addEventListener("selectionchange", sync);
    preference.addEventListener("change", sync);
    const observer = new ResizeObserver(sync);
    observer.observe(input);

    return () => {
      for (const event of events) input.removeEventListener(event, sync);
      input.removeEventListener("compositionstart", startComposition);
      input.removeEventListener("compositionend", endComposition);
      document.removeEventListener("selectionchange", sync);
      preference.removeEventListener("change", sync);
      observer.disconnect();
      delete input.dataset.smoothCaret;
    };
  }, [x]);

  return <motion.span ref={caret} className="od-smooth-caret" aria-hidden hidden style={{ x }} />;
}
